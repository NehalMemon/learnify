import { test, expect, type APIRequestContext, type Page } from '@playwright/test';

// Note: Ensure you have test accounts seeded in the DB before running
const ADMIN_CREDENTIALS = { email: 'admin@learnify.pk', password: 'YourStr0ngPass!' };
const STUDENT_CREDENTIALS = { email: 'student@example.com', password: 'Password123!' };

async function loginViaApi(
  request: APIRequestContext,
  credentials: { email: string; password: string }
) {
  const csrfResponse = await request.get('http://127.0.0.1:5000/api/v1/csrf-token');
  const { csrfToken } = await csrfResponse.json();

  const loginResponse = await request.post('http://127.0.0.1:5000/api/v1/auth/login', {
    headers: {
      'x-csrf-token': csrfToken,
    },
    data: {
      email: credentials.email,
      password: credentials.password,
    },
  });

  const loginData = await loginResponse.json();
  if (!loginData?.success) {
    throw new Error(`Login failed for ${credentials.email}: ${loginData?.message ?? 'unknown error'}`);
  }

  return loginData;
}

async function loginWithRetry(
  page: Page,
  credentials: { email: string; password: string; expectedUrl: RegExp; redirectPath: string }
) {
  const loginData = await loginViaApi(page.request, credentials);

  await page.goto(
    `/auth-success?token=${encodeURIComponent(loginData.data.accessToken)}&refreshToken=${encodeURIComponent(loginData.data.refreshToken)}&redirect=${encodeURIComponent(credentials.redirectPath)}`
  );

  await expect(page).toHaveURL(credentials.expectedUrl, { timeout: 20000 });
  await page.waitForLoadState('networkidle');

  return loginData;
}

test.describe('Core Quiz Engine Lifecycle', () => {
  test.setTimeout(180000);
  
  test('Admin creates a quiz, Student takes it, BullMQ grades it', async ({ browser, page: baseTestPage }) => {
    const quizTitle = `E2E Automated Integration Test ${Date.now()}`;
    const studentLoginData = await loginViaApi(baseTestPage.request, STUDENT_CREDENTIALS);
    const studentStudyYear = Number(studentLoginData?.data?.user?.studyYear ?? 1) || 1;

    // --- 1. ADMIN CONTEXT ---
    const adminContext = await browser.newContext();
    const adminPage = await adminContext.newPage();
    
    // Admin Login
    await loginWithRetry(adminPage, {
      ...ADMIN_CREDENTIALS,
      expectedUrl: /.*admin\/dashboard/,
      redirectPath: '/admin/dashboard',
    });

    // Get JWT token from cookies for API calls
    const cookies = await adminContext.cookies();
    const accessTokenCookie = cookies.find(c => c.name === 'accessToken');
    
    // Fetch CSRF token for the state-changing API request
    const csrfResponse = await adminPage.request.get('http://127.0.0.1:5000/api/v1/csrf-token');
    const { csrfToken } = await csrfResponse.json();

    // Create quiz via API (more reliable than form interaction)
    const createQuizResponse = await adminPage.request.post('http://127.0.0.1:5000/api/v1/admin/quizzes/full', {
      headers: {
        Authorization: accessTokenCookie ? `Bearer ${accessTokenCookie.value}` : '',
        'x-csrf-token': csrfToken,
      },
      data: {
        title: quizTitle,
        categoryId: 'f1c731d1-2d03-488c-9eda-87183d25c093', // Anatomy category
        subject: 'Biology',
        year: studentStudyYear,
        questions: [
          {
            questionText: 'What is the powerhouse of the cell?',
            optionA: 'Nucleus',
            optionB: 'Mitochondria',
            optionC: 'Ribosome',
            optionD: 'Golgi Apparatus',
            correctOption: 'B',
            explanation: 'Mitochondria is responsible for producing energy (ATP) in cells.'
          }
        ]
      }
    });

    const createResponse = await createQuizResponse.json();
    console.log('Create Quiz API Response:', createResponse);
    expect(createResponse.success).toBe(true);
    
    await adminContext.close();

    // --- 2. STUDENT CONTEXT ---
    const studentContext = await browser.newContext();
    const studentPage = await studentContext.newPage();

    // Student Login
    await loginWithRetry(studentPage, {
      ...STUDENT_CREDENTIALS,
      expectedUrl: /.*dashboard\/quizzes/,
      redirectPath: '/dashboard/quizzes',
    });

    // Student Starts Quiz
    await studentPage.fill('#quiz-search', quizTitle);
    const quizCard = studentPage.locator('[data-slot="card"]').filter({ hasText: quizTitle }).first();
    await expect(quizCard).toBeVisible({ timeout: 30000 });
    await quizCard.getByRole('link', { name: /Start Exam/i }).click();
    const startExamButton = studentPage.getByRole('button', { name: /Start Examination/i });
    await expect(startExamButton).toBeEnabled({ timeout: 20000 });
    await startExamButton.click();

    // Student Answers & Submits
    await expect(studentPage).toHaveURL(/.*dashboard\/quiz\/attempt\/.*/, { timeout: 30000 });
    await studentPage.waitForSelector('text="What is the powerhouse of the cell?"');
    
    // Select the known correct answer.
    await studentPage.click('text="Mitochondria"');
    
    // Finalize attempt through confirmation dialog
    await studentPage.getByRole('button', { name: /Finalize & Submit/i }).click();
    await studentPage.getByRole('button', { name: /Yes, Finalize/i }).click();

    // --- 3. BULLMQ / RESULTS VERIFICATION ---
    await expect(studentPage).toHaveURL(/.*dashboard\/quiz\/results\/.*/, { timeout: 20000 });
    const finalScore = studentPage.getByText(/Final Score\s*100%/);

    // BullMQ finalization can vary; reload the review until the worker-flushed score is rendered.
    await expect.poll(
      async () => {
        if (await finalScore.isVisible()) return true;

        await studentPage.waitForTimeout(1500);
        await studentPage.reload();
        await studentPage.waitForLoadState('networkidle');
        return finalScore.isVisible();
      },
      {
        timeout: 90000,
        intervals: [1000, 2000, 3000, 5000],
        message: 'Wait for BullMQ grading to render Final Score 100%',
      }
    ).toBe(true);

    await studentContext.close();
  });
});
