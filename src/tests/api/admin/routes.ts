const SRC_DIR = "../../../";
const PAGES_API_ADMIN = `${SRC_DIR}pages/api/admin/`;

export const API_ROUTE_MODULES = {
  changePassword: `${PAGES_API_ADMIN}change-password`,
  settings: `${PAGES_API_ADMIN}settings`,
  upload: `${PAGES_API_ADMIN}upload`,
  media: `${SRC_DIR}pages/media/[filename]`,
} as const;
