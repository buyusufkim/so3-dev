import { useEffect } from "react";

type PageSEOProps = {
  title: string;
  description?: string;
  canonical?: string;
  ogType?: "website" | "article";
  ogImage?: string;
  robots?: "index, follow" | "noindex, follow" | "noindex, nofollow";
};

export function PageSEO({
  title,
  description,
  canonical,
  ogType = "website",
  ogImage,
  robots = "index, follow",
}: PageSEOProps) {
  useEffect(() => {
    // Title
    document.title = title;

    const updateOrCreateMeta = (keyAttr: string, keyVal: string, contentVal: string | undefined) => {
      let element = document.querySelector(`meta[${keyAttr}="${keyVal}"]`);
      if (contentVal === undefined) {
        if (element) {
          element.remove();
        }
        return;
      }
      
      if (!element) {
        element = document.createElement("meta");
        element.setAttribute(keyAttr, keyVal);
        document.head.appendChild(element);
      }
      element.setAttribute("content", contentVal);
    };

    const updateOrCreateLink = (relVal: string, hrefVal: string | undefined) => {
      let element = document.querySelector(`link[rel="${relVal}"]`);
      if (hrefVal === undefined) {
        if (element) {
          element.remove();
        }
        return;
      }
      if (!element) {
        element = document.createElement("link");
        element.setAttribute("rel", relVal);
        document.head.appendChild(element);
      }
      element.setAttribute("href", hrefVal);
    };

    updateOrCreateMeta("name", "description", description);
    updateOrCreateMeta("property", "og:description", description);
    updateOrCreateMeta("name", "twitter:description", description);
    
    updateOrCreateLink("canonical", canonical);
    updateOrCreateMeta("property", "og:url", canonical);
    
    updateOrCreateMeta("property", "og:title", title);
    updateOrCreateMeta("name", "twitter:title", title);
    
    updateOrCreateMeta("property", "og:type", ogType);

    if (ogImage) {
      updateOrCreateMeta("property", "og:image", ogImage);
      updateOrCreateMeta("name", "twitter:image", ogImage);
      updateOrCreateMeta("name", "twitter:card", "summary_large_image");
    } else {
      updateOrCreateMeta("property", "og:image", undefined);
      updateOrCreateMeta("name", "twitter:image", undefined);
      updateOrCreateMeta("name", "twitter:card", "summary");
    }

    updateOrCreateMeta("name", "robots", robots);

    // JSON-LD Logic
    const scriptId = "so3-home-jsonld";
    let scriptElement = document.getElementById(scriptId);

    if (canonical === "https://so3pt.com.tr/" && robots.includes("index")) {
      if (!scriptElement) {
        scriptElement = document.createElement("script");
        scriptElement.id = scriptId;
        scriptElement.setAttribute("type", "application/ld+json");
        document.head.appendChild(scriptElement);
      }
      const jsonLdData = {
        "@context": "https://schema.org",
        "@graph": [
          {
            "@type": "Organization",
            "@id": "https://so3pt.com.tr/#organization",
            "name": "SO3 Personal Training",
            "url": "https://so3pt.com.tr/",
            "logo": "https://so3pt.com.tr/brand/so3-logo.png"
          },
          {
            "@type": "WebSite",
            "@id": "https://so3pt.com.tr/#website",
            "name": "SO3 Personal Training",
            "url": "https://so3pt.com.tr/",
            "inLanguage": "tr-TR",
            "publisher": {
              "@id": "https://so3pt.com.tr/#organization"
            }
          }
        ]
      };
      scriptElement.textContent = JSON.stringify(jsonLdData).replace(/</g, '\\u003c');
    } else {
      if (scriptElement) {
        scriptElement.remove();
      }
    }

    return () => {
      const el = document.getElementById(scriptId);
      if (el) {
        el.remove();
      }
    };
  }, [title, description, canonical, ogType, ogImage, robots]);

  return null;
}
