import { useEffect } from "react";

type PageSEOProps = {
  title: string;
  description?: string;
  canonical?: string;
  ogType?: "website" | "article";
  ogImage?: string;
};

export function PageSEO({
  title,
  description,
  canonical,
  ogType = "website",
  ogImage,
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
  }, [title, description, canonical, ogType, ogImage]);

  return null;
}
