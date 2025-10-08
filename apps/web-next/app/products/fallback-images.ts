export const FALLBACK_IMAGES = [
  "https://images.pexels.com/photos/11112728/pexels-photo-11112728.jpeg?auto=compress&cs=tinysrgb&w=1200&q=80",
  "https://images.pexels.com/photos/20110516/pexels-photo-20110516.jpeg?auto=compress&cs=tinysrgb&w=1200&q=80",
  "https://images.pexels.com/photos/20943579/pexels-photo-20943579.jpeg?auto=compress&cs=tinysrgb&w=1200&q=80",
  "https://images.pexels.com/photos/4458519/pexels-photo-4458519.jpeg?auto=compress&cs=tinysrgb&w=1200&q=80",
  "https://images.pexels.com/photos/28859522/pexels-photo-28859522.jpeg?auto=compress&cs=tinysrgb&w=1200&q=80",
  "https://images.pexels.com/photos/13779104/pexels-photo-13779104.jpeg?auto=compress&cs=tinysrgb&w=1200&q=80",
  "https://images.pexels.com/photos/1464625/pexels-photo-1464625.jpeg?auto=compress&cs=tinysrgb&w=1200&q=80",
  "https://images.pexels.com/photos/15352967/pexels-photo-15352967.jpeg?auto=compress&cs=tinysrgb&w=1200&q=80",
  "https://images.pexels.com/photos/27204287/pexels-photo-27204287.jpeg?auto=compress&cs=tinysrgb&w=1200&q=80",
  "https://images.pexels.com/photos/8436729/pexels-photo-8436729.jpeg?auto=compress&cs=tinysrgb&w=1200&q=80",
  "https://images.pexels.com/photos/18311089/pexels-photo-18311089.jpeg?auto=compress&cs=tinysrgb&w=1200&q=80",
  "https://images.pexels.com/photos/13787561/pexels-photo-13787561.jpeg?auto=compress&cs=tinysrgb&w=1200&q=80",
  "https://images.pexels.com/photos/12566547/pexels-photo-12566547.jpeg?auto=compress&cs=tinysrgb&w=1200&q=80",
  "https://images.pexels.com/photos/27204305/pexels-photo-27204305.jpeg?auto=compress&cs=tinysrgb&w=1200&q=80",
  "https://images.pexels.com/photos/18761052/pexels-photo-18761052.jpeg?auto=compress&cs=tinysrgb&w=1200&q=80",
  "https://images.pexels.com/photos/1183266/pexels-photo-1183266.jpeg?auto=compress&cs=tinysrgb&w=1200&q=80",
  "https://images.pexels.com/photos/167699/pexels-photo-167699.jpeg?auto=compress&cs=tinysrgb&w=1200&q=80",
  "https://images.pexels.com/photos/259200/pexels-photo-259200.jpeg?auto=compress&cs=tinysrgb&w=1200&q=80"
];

export function getFallbackImage(index: number): string {
  if (FALLBACK_IMAGES.length === 0) {
    return "https://images.unsplash.com/photo-1512495968555-7f58f58f0caa?auto=format&fit=crop&w=800&q=80";
  }
  const normalized = index % FALLBACK_IMAGES.length;
  return FALLBACK_IMAGES[normalized];
}

export function getFallbackImageByKey(key: string): string {
  if (!key) {
    return getFallbackImage(0);
  }
  let hash = 0;
  for (let i = 0; i < key.length; i += 1) {
    hash = (hash << 5) - hash + key.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % (FALLBACK_IMAGES.length || 1);
  return getFallbackImage(index);
}
