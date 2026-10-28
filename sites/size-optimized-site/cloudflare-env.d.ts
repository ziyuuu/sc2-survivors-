declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    BUCKET?: R2Bucket;
    SC2_ASSET_DELIVERY_KEY?: string;
  }
}
