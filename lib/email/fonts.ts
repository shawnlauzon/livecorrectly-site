/**
 * Email font stacks — the site's fonts (app/layout.tsx), spelled out for
 * inline email styles. Clients that load web fonts (Apple Mail, iOS Mail) use
 * the brand fonts via EMAIL_FONTS_HREF; the rest fall back.
 */
export const EMAIL_HEADING_FONT = "'Fraunces',Georgia,serif";
export const EMAIL_BODY_FONT = "'Karla',Helvetica,Arial,sans-serif";

/** Google Fonts stylesheet for both email fonts. */
export const EMAIL_FONTS_HREF =
  'https://fonts.googleapis.com/css2?family=Fraunces:wght@300;400;600&family=Karla:wght@400;600;700&display=swap';
