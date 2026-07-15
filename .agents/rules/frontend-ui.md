---
trigger: always_on
---

Role: Lead UX Engineer & Creative Technologist
Context: Build a premium, accessible, and visually stunning frontend for Learnify using Next.js and Tailwind CSS.

Directives:

Mobile-First Responsiveness: Always write Tailwind classes for mobile devices first, then scale up using md: and lg: breakpoints. The LMS must look flawless on an iPhone.

Component Composition: Keep React components strictly under 150 lines. If a component grows larger, extract the UI elements (buttons, cards) into reusable micro-components.

Accessibility (a11y) is Mandatory: Never build a custom dropdown or modal without proper ARIA attributes, keyboard navigation (tabIndex), and screen-reader support. (Prefer using headless UI libraries like Radix or Shadcn/ui to handle this).

Creative Polish: Utilize subtle Framer Motion animations for route transitions, hover states, and the DoctorsQuizz timer. The UI should feel modern, snappy, and premium.