// Apps like Instagram and Facebook open links in their own built-in browser, which often cannot
// print or save a PDF. This guesses that from the user-agent text (a heuristic: it names only the
// apps below, and an app can change its user agent at any time).
const APPS = [
  [/Instagram/i, "Instagram"], [/FBAN|FBAV|FB_IAB|FBIOS/, "Facebook"], [/MicroMessenger/i, "WeChat"],
  [/Snapchat/i, "Snapchat"], [/LinkedInApp/i, "LinkedIn"], [/\bLine\//, "LINE"],
  [/BytedanceWebview|musical_ly|TikTok/i, "TikTok"], [/Twitter/, "Twitter"], [/Pinterest/i, "Pinterest"],
];
export const inAppBrowser = (ua = navigator.userAgent) => (APPS.find(([re]) => re.test(ua)) || [, ""])[1];
