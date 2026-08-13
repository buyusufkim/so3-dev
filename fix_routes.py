import re

with open('src/routes/index.tsx', 'r') as f:
    content = f.read()

# Add Lazy imports
lazy_imports = """const MediaPage = lazy(() => import("../admin/pages/Media").then(m => ({ default: m.MediaPage })));
const AdminEventsList = lazy(() => import("../admin/pages/events/AdminEventsList").then(m => ({ default: m.AdminEventsList })));
const AdminEventEditor = lazy(() => import("../admin/pages/events/AdminEventEditor").then(m => ({ default: m.AdminEventEditor })));"""

content = content.replace('const MediaPage = lazy(() => import("../admin/pages/Media").then(m => ({ default: m.MediaPage })));', lazy_imports)

# Add routes
routes = """      {
        path: "media",
        element: <AdminSuspense><MediaPage /></AdminSuspense>,
      },
      {
        path: "events",
        element: <AdminSuspense><AdminEventsList /></AdminSuspense>,
      },
      {
        path: "events/new",
        element: <AdminSuspense><AdminEventEditor /></AdminSuspense>,
      },
      {
        path: "events/:id",
        element: <AdminSuspense><AdminEventEditor /></AdminSuspense>,
      },"""

content = content.replace("""      {
        path: "media",
        element: <AdminSuspense><MediaPage /></AdminSuspense>,
      },""", routes)

with open('src/routes/index.tsx', 'w') as f:
    f.write(content)
