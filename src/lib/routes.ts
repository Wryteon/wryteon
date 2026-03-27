export const APP_ROUTES = {
  auth: {
    login: "/auth/login",
  },
  api: {
    settings: "/api/admin/settings",
    changePassword: "/api/admin/change-password",
    upload: "/api/admin/upload",
  },
  media: {
    root: "/media",
  },
} as const;

export const MEDIA_FILE_PREFIX = `${APP_ROUTES.media.root}/`;
