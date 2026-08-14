---
name: Majal Connectivity System
colors:
  surface: '#f8f9ff'
  surface-dim: '#cbdbf5'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff4ff'
  surface-container: '#e5eeff'
  surface-container-high: '#dce9ff'
  surface-container-highest: '#d3e4fe'
  on-surface: '#0b1c30'
  on-surface-variant: '#424654'
  inverse-surface: '#213145'
  inverse-on-surface: '#eaf1ff'
  outline: '#737785'
  outline-variant: '#c3c6d6'
  surface-tint: '#0056d2'
  primary: '#0040a1'
  on-primary: '#ffffff'
  primary-container: '#0056d2'
  on-primary-container: '#ccd8ff'
  inverse-primary: '#b2c5ff'
  secondary: '#516073'
  on-secondary: '#ffffff'
  secondary-container: '#d4e4fb'
  on-secondary-container: '#576679'
  tertiary: '#43474b'
  on-tertiary: '#ffffff'
  tertiary-container: '#5a5f62'
  on-tertiary-container: '#d5d9dd'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dae2ff'
  primary-fixed-dim: '#b2c5ff'
  on-primary-fixed: '#001847'
  on-primary-fixed-variant: '#0040a1'
  secondary-fixed: '#d4e4fb'
  secondary-fixed-dim: '#b8c8de'
  on-secondary-fixed: '#0d1c2d'
  on-secondary-fixed-variant: '#39485a'
  tertiary-fixed: '#dfe3e7'
  tertiary-fixed-dim: '#c3c7cb'
  on-tertiary-fixed: '#171c1f'
  on-tertiary-fixed-variant: '#43474b'
  background: '#f8f9ff'
  on-background: '#0b1c30'
  surface-variant: '#d3e4fe'
typography:
  headline-xl:
    fontFamily: Hanken Grotesk
    fontSize: 48px
    fontWeight: '800'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Hanken Grotesk
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Hanken Grotesk
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 36px
  headline-md:
    fontFamily: Hanken Grotesk
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  body-lg:
    fontFamily: Hanken Grotesk
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Hanken Grotesk
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-sm:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.05em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  base: 8px
  container-max: 1200px
  gutter: 24px
  margin-desktop: 64px
  margin-mobile: 20px
---

## Brand & Style

This design system is built on the principles of **Professionalism, Reliability, and Speed**. It serves as the digital foundation for a modern Internet Service Provider, prioritizing clarity and trust above all else. 

The aesthetic is **Corporate / Modern** with a strong leaning toward **Minimalism**. It utilizes expansive white space to denote a "uncluttered" connection experience. The interface feels premium through the use of high-contrast typography and a restricted, authoritative color palette. Every element is designed to feel intentional and stable, reflecting the robust nature of the infrastructure it represents.

## Colors

The palette is derived directly from the brand’s visual identity to ensure seamless brand recognition.

- **Primary (#0056D2):** A vibrant, high-energy blue used for action-oriented elements like primary buttons, active navigation states, and key icons. It symbolizes technology and speed.
- **Secondary (#000D1D):** A deep, near-black navy used for primary headings, body text, and brand-heavy containers. This provides the "weight" and authority needed for a premium service.
- **Background:** A crisp, stark white (#FFFFFF) is the mandatory canvas to ensure maximum legibility and a modern, airy feel.
- **Surface/Neutral:** Light grays are used sparingly for dividers and subtle card backgrounds to maintain a flat, clean hierarchy without introducing unnecessary visual noise.

## Typography

The typography system uses **Hanken Grotesk** as the primary typeface. It is a clean, sharp, and contemporary sans-serif that offers excellent legibility at both large display sizes and small body copy.

- **Headlines:** Set in the Secondary Navy color with tight letter-spacing and heavy weights (Bold/ExtraBold) to create a commanding presence.
- **Body:** Set in a slightly lighter weight of the Secondary Navy or a dark neutral for optimal long-form reading.
- **Technical Labels:** **JetBrains Mono** is used for utility-based information (IP addresses, data speeds, bandwidth limits) to provide a subtle "tech-forward" and precise feel that distinguishes data from prose.

## Layout & Spacing

The design system utilizes a **Fixed Grid** model for desktop to maintain a premium, editorial feel, transitioning to a fluid model for mobile devices.

- **Grid:** A 12-column grid is standard for desktop. Elements should align strictly to these columns to reinforce the "engineered" nature of the brand.
- **Rhythm:** An 8px base unit governs all padding and margin decisions.
- **Desktop:** Generous outer margins (64px+) ensure the content feels centered and important.
- **Mobile:** Margins shrink to 20px, and the 12-column grid collapses to a single-column stack. Vertical rhythm is increased to 32px or 48px between sections to prevent the UI from feeling cramped.

## Elevation & Depth

This system avoids heavy shadows in favor of **Low-contrast outlines** and **Tonal layers**. Depth is created through structural separation rather than physical metaphors.

- **Default Surface:** Flat white.
- **Elevated States (e.g., Hovered Cards):** Instead of a shadow, use a subtle 1px border in a soft blue-gray or a very light gray background fill (#F8FAFC).
- **Primary Actions:** Use solid color fills (Primary Blue) to "pop" elements forward.
- **Modals:** When a modal is required, use a high-density backdrop blur (20px) with a semi-transparent white overlay to maintain the "light and airy" brand feeling while focusing user attention.

## Shapes

The shape language is **Soft (Level 1)**. 

To maintain a professional and trustworthy corporate image, we avoid overly rounded or "bubbly" shapes. Standard components (buttons, inputs) utilize a subtle 4px (`0.25rem`) corner radius. This provides a modern touch while maintaining the structural integrity and "sharpness" associated with a high-performance ISP. Larger containers like cards may use up to 8px (`0.5rem`) to feel slightly more approachable.

## Components

- **Buttons:** Primary buttons are solid Primary Blue with white text. They should have a horizontal padding that is 2.5x the vertical padding for a wide, stable appearance. Secondary buttons use the Navy color for the label and a thin outline.
- **Input Fields:** Use a 1px border in a neutral gray. On focus, the border transitions to Primary Blue with a subtle 2px outer glow of the same color (low opacity). Labels sit strictly above the input in the Label-sm typography style.
- **Status Chips:** Used for "Online/Offline" status. Use a small dot icon next to the text. Online uses a vibrant green; Offline uses a neutral gray.
- **Speed Gauges/Data Visualizations:** Use the Primary Blue for active data and the Secondary Navy for background "empty" tracks. These should be clean, geometric, and free of gradients.
- **Cards:** White background with a 1px soft border. No shadow. The header of the card should use the Headline-md style in Secondary Navy.