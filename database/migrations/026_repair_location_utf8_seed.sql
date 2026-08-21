UPDATE site_settings
SET setting_value = JSON_SET(
    setting_value,
    '$.address',
    'Yıldırım Beyazıt, Aşık Veysel Blv. No:69/4, 38030 Melikgazi / Kayseri'
)
WHERE setting_key = 'location'
  AND JSON_UNQUOTE(JSON_EXTRACT(setting_value, '$.address')) = 'Yu0131ldu0131ru0131m Beyazu0131t, Au015fu0131k Veysel Blv. No:69/4, 38030 Melikgazi / Kayseri';
