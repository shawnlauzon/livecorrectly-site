import Script from 'next/script'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Widget Test — Live Correctly',
  description: 'Maia Mechanics widget test page',
  robots: 'noindex, nofollow', // Keep it hidden from search engines
}

export default function WidgetTestPage() {
  const apiKey = process.env.NEXT_PUBLIC_MAIA_API_KEY || ''

  return (
    <>
      {/* Load widget styles */}
      <Script
        id="mmi-widget-css-loader"
        strategy="beforeInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            function loadCssStylesIfNotExist(){
              const e=document.styleSheets;
              for(let t=0,s=e.length;t<s;t++)
                if('https://widget.maiamechanics.com/v2/css/app.css'===e[t].href)return;
              const t=document.createElement('link');
              t.rel='stylesheet',
              t.href='https://widget.maiamechanics.com/v2/css/app.css',
              document.getElementsByTagName('head')[0].appendChild(t)
            }
            loadCssStylesIfNotExist();
          `,
        }}
      />

      {/* Load widget JavaScript */}
      <Script
        src="https://widget.maiamechanics.com/v2/js/app.js"
        strategy="afterInteractive"
      />

      <div style={{ padding: '2rem' }}>
        <h1>Maia Mechanics Widget Test</h1>
        {!apiKey && (
          <p style={{ color: 'red' }}>
            Warning: NEXT_PUBLIC_MAIA_API_KEY is not set
          </p>
        )}
        {/* @ts-ignore - custom element not in TypeScript definitions */}
        <mmi-widget apikey={apiKey}></mmi-widget>
      </div>
    </>
  )
}
