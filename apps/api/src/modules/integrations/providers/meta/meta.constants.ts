export const META_OAUTH_SCOPES = {
  facebook: [
    'public_profile',
    'pages_show_list',
    'pages_read_engagement',
    'pages_manage_metadata',
    'leads_retrieval',
    'business_management',
    'ads_read',
    'ads_management',
  ],
  instagram: [
    'public_profile',
    'pages_show_list',
    'pages_read_engagement',
    'instagram_basic',
    'instagram_manage_insights',
    'business_management',
    'ads_read',
  ],
} as const;

export const META_TOKEN_EXPIRY_SKEW_MS = 5 * 60 * 1000;

