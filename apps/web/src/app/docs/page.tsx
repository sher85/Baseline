import Script from "next/script";

export const metadata = {
  title: "Baseline API Docs",
  description: "OpenAPI reference for the Baseline API."
};

const redocInitScript = `
  window.addEventListener("load", function () {
    if (!window.Redoc) {
      return;
    }

    window.Redoc.init(
      "/openapi/openapi.json",
      {
        expandResponses: "200,201",
        hideDownloadButton: false,
        theme: {
          colors: {
            primary: {
              main: "#0f766e"
            }
          }
        }
      },
      document.getElementById("redoc-container")
    );
  });
`;

export default function DocsPage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#f5f7f8"
      }}
    >
      <div
        id="redoc-container"
        style={{
          minHeight: "100vh"
        }}
      />
      <Script
        src="https://cdn.redoc.ly/redoc/latest/bundles/redoc.standalone.js"
        strategy="afterInteractive"
      />
      <Script id="redoc-init" strategy="afterInteractive">
        {redocInitScript}
      </Script>
    </main>
  );
}
