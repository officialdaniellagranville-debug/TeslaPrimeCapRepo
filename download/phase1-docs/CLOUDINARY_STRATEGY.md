# Cloudinary Strategy

> Phase 1 — Enterprise Investment Platform  
> Media asset management, upload security, and delivery optimization using Cloudinary.

---

## 1. Cloudinary Overview

Cloudinary serves as the centralized media asset management service for the entire platform. All file uploads — user avatars, KYC verification documents, gift card screenshots for deposit verification, platform branding assets, and email template images — are stored and served through Cloudinary. This eliminates the need for self-hosted file storage, provides built-in image processing capabilities, and ensures global asset delivery through Cloudinary's CDN.

The platform uses Cloudinary's Advanced plan (or equivalent tier) to access features required for an enterprise deployment: signed uploads, custom metadata, folder-level access controls, transformation limits appropriate for production traffic, and dedicated support. The Cloudinary account is configured with a single cloud name, and environments (development, staging, production) are separated using upload presets and folder prefixes rather than separate Cloudinary accounts.

All Cloudinary interactions from the application backend use environment variables for the cloud name, API key, and API secret. These credentials are never exposed to the frontend application. The API secret is used exclusively on the backend to generate signed upload URLs and signed delivery URLs for private assets. The API key and cloud name are the only values that may be exposed to the frontend, and only when required for unsigned delivery of public assets.

---

## 2. Folder Structure

The Cloudinary folder hierarchy mirrors the platform's data model, providing logical organization and enabling folder-level access control policies. Each top-level folder corresponds to a category of assets, with subfolders providing granular isolation.

- **`avatars/{userId}/`** — User profile pictures. Each user has their own subfolder, allowing for version management and cleanup on account deletion. The userId is the platform's internal UUID, never the user's email or display name.
- **`kyc/{userId}/{documentType}/`** — KYC verification documents. Organized by user and then by document type (id_front, id_back, selfie, proof_of_address). This structure supports document lifecycle management and ensures all KYC materials for a user can be located and audited together.
- **`gift-cards/{depositId}/`** — Gift card screenshots submitted as deposit proof. Organized by deposit ID, which links back to the user and the deposit transaction. Multiple images per deposit are stored in the same folder.
- **`platform/branding/`** — Platform logos, icons, favicon, and brand assets used across the application. These are static assets managed by the development team, not user-uploaded content.
- **`platform/email/`** — Images embedded in transactional and marketing emails. Stored separately from branding assets to allow independent caching and access control policies.
- **`system/`** — System-generated assets such as default placeholder avatars, dynamically generated charts or reports, and any programmatic image output.

Folder creation happens automatically on first upload (Cloudinary creates folders implicitly). Folder-level listing APIs are restricted to admin-only access to prevent enumeration of user folders and resource IDs.

---

## 3. Upload Security

All uploads use Cloudinary's signed upload mechanism. The backend generates a signed upload URL using the API secret, with an expiration timestamp, and returns this URL to the frontend for the actual file upload. The frontend never has access to the API secret. Unsigned uploads are disabled at the Cloudinary account level through the upload settings, ensuring that all uploads must pass through the backend's signature generation.

Upload presets are configured for each asset category with strict restrictions. Avatar uploads are limited to JPEG, PNG, and WebP formats, with a maximum file size of 5MB and dimensions between 100x100 and 4000x4000 pixels. KYC document uploads support JPEG, PNG, WebP, and PDF formats, with a maximum file size of 10MB. Gift card screenshots are limited to JPEG and PNG, with a maximum file size of 8MB. These restrictions are enforced at the Cloudinary level (upload preset configuration) and duplicated at the application level for defense-in-depth.

Pre-upload validation on the application backend includes file type verification via magic bytes (not just file extension), file size checking, and basic image integrity validation (verifying the file is a valid image that can be decoded). For KYC documents and gift card screenshots, additional validation checks for minimum image dimensions (300x300 pixels) to ensure the content is legible for verification. Files that fail pre-upload validation are rejected before the upload request is sent to Cloudinary, saving bandwidth and storage costs.

Malware scanning is handled through Cloudinary's built-in content moderation and anti-malware capabilities. If the Cloudinary add-on is not available, files are scanned by ClamAV (running as a sidecar service) before the upload is authorized. Scanning results are recorded in the upload metadata and any file flagged as malicious is rejected and the event is logged for security review.

---

## 4. Access Control

Access to Cloudinary assets is tiered according to the sensitivity of the content. The three access tiers are: Public, Private (authenticated), and Strictly Private (admin-only).

**Public assets** include platform branding images (logos, icons, brand assets) and email template images. These are delivered without authentication using Cloudinary's public delivery URLs. They are cached aggressively by the CDN and browsers. Default placeholder avatars also fall into this category.

**Private assets (authenticated)** include user avatars and gift card screenshots. These are uploaded with Cloudinary's `type: "private"` delivery type, meaning they are not accessible via public URLs. Access requires a signed delivery URL generated by the backend, which is only provided to authenticated users who have the appropriate authorization (a user can access their own avatar, an admin can access any avatar). Signed URLs for private assets have an expiration of 1 hour.

**Strictly Private assets (admin-only)** include all KYC documents. These are uploaded with `type: "authenticated"` delivery type, providing the highest level of access restriction. Access to KYC documents requires a signed URL generated by the backend that includes a short expiration (30 minutes). Every access to a KYC document is logged in the platform's audit trail, recording the admin user ID, timestamp, document ID, and the access reason. KYC document URLs are single-use where possible, invalidating after the first download.

Access control is enforced at both the Cloudinary level (delivery type restrictions) and the application level (backend endpoint authorization checks). The application never returns a Cloudinary URL directly for non-public assets — instead, it returns a proxied endpoint (`/api/v1/files/{fileId}`) that validates authorization, generates a signed URL, and optionally streams the file through the backend to prevent URL leakage.

---

## 5. Image Processing

Cloudinary's on-the-fly image transformations are used for all image delivery optimization. Automatic format conversion delivers images in WebP format to browsers that support it, with JPEG fallback for older browsers. This is achieved by appending `f_auto` to the Cloudinary URL, which negotiates the optimal format based on the client's `Accept` header.

Responsive breakpoints are generated for images that appear at multiple sizes across the application. Avatar images are generated at three sizes on upload: 64x64 (thumbnail for lists), 128x128 (standard display), and 256x256 (profile page). This is achieved using Cloudinary's eager transformations during upload, pre-generating all required sizes rather than generating them on first request. Platform branding images are similarly generated at required sizes during the upload/deployment process.

Face detection is enabled for avatar crops using Cloudinary's `g_face` gravity parameter. When users upload a profile picture, the image is automatically centered and cropped to focus on the detected face region. If no face is detected, the image falls back to center gravity. Avatar images are additionally cropped to a 1:1 aspect ratio using `c_thumb,g_face`.

Quality optimization is applied to all delivered images using `q_auto:good`, which automatically balances file size and visual quality. For user-uploaded images, the original is preserved in Cloudinary's storage, and all deliveries serve the optimized version. This means uploads store the full-quality original while end users receive compressed, web-optimized versions.

Lazy loading is implemented on the frontend using Cloudinary transformation URLs that return a low-quality placeholder (LQP) image. The LQP is a tiny (typically < 1KB) blurred version of the image generated by `q_auto:low,e_blur:1000,w_20`. The frontend displays the LQP immediately and loads the full image asynchronously, creating a smooth loading experience without layout shift.

---

## 6. Document Handling

KYC verification documents require special handling that differs from general image processing. KYC documents (government-issued IDs, selfie photos, proof of address documents) must be stored and delivered in their original quality without any transformation that could alter content. Image processing features such as compression, format conversion, cropping, or enhancement are explicitly disabled for KYC document deliveries.

KYC document uploads store the original file without any eager transformations. The original quality must be preserved for manual verification by compliance officers and for potential regulatory audit. When an admin views a KYC document, they receive the unmodified original file via a signed authenticated URL.

A processed/thumbnail version of KYC documents is generated using Cloudinary's eager transformations for admin preview convenience. This thumbnail is a compressed, resized version suitable for quick review in the admin panel without downloading the full-resolution original. The admin can view the thumbnail for triage and then download the original for detailed verification.

PDF support is critical for proof of address documents, which are commonly provided as PDF files (bank statements, utility bills). Cloudinary supports PDF upload and can generate image thumbnails from the first page of a PDF using the `page` parameter. The PDF original is preserved, and a thumbnail image is generated for quick admin preview. PDFs are stored with a maximum size of 10MB and are subject to the same access control (authenticated delivery, signed URLs, audit logging) as image-based KYC documents.

---

## 7. Naming Convention

All Cloudinary public IDs follow a structured naming convention: `{category}/{userId or resourceId}/{timestamp}-{randomHash}`. This format provides uniqueness, sortability, traceability, and security. The category segment matches the folder structure (avatars, kyc, gift-cards, platform, system). The resource identifier segment uses the platform's internal UUID for the related entity (userId, depositId, etc.).

User-controlled filenames are never used as Cloudinary public IDs. When a user uploads a file named `my_profile_pic_final_v2.jpg`, the filename is discarded entirely and replaced with the system-generated public ID. This prevents filename-based attacks (path traversal, special character injection), eliminates filename collisions, and removes any potential for information leakage through filenames.

The timestamp component uses Unix epoch time in milliseconds at the time of upload. The random hash component is an 8-character alphanumeric string generated by `crypto.randomBytes(4).toString('hex')`. Together, these ensure uniqueness even for rapid successive uploads by the same user to the same category. The file extension is preserved from the original upload to maintain format information.

Cloudinary's internal resource IDs (the `public_id` field) are used as the primary reference in the application database. The database stores the Cloudinary public ID for each uploaded file, and all operations (retrieval, transformation, deletion) use this ID. No other identifier (filename, URL, user-provided name) is stored as the primary reference.

---

## 8. Metadata

Custom metadata is attached to every uploaded asset using Cloudinary's structured metadata feature. Metadata fields provide context about the asset that is queryable through Cloudinary's API and useful for administrative management, audit, and lifecycle automation.

The standard metadata fields attached to all uploads are:
- **`uploaderId`** — The internal UUID of the user or admin who uploaded the file.
- **`documentType`** — The category/subcategory of the document (avatar, id_front, id_back, selfie, proof_of_address, gift_card_screenshot, branding, email_asset).
- **`uploadTimestamp`** — ISO 8601 timestamp of the upload.
- **`relatedEntityId`** — The ID of the related business entity (e.g., KYC submission ID for KYC documents, deposit ID for gift card screenshots).
- **`verificationStatus`** — For KYC and gift card documents: pending, approved, rejected, expired.
- **`source`** — The upload source (web, mobile, admin_panel, system).

Metadata is set during the upload request using Cloudinary's upload API `context` parameter and structured metadata fields. Metadata is immutable after upload for audit integrity — updates to verification status or other metadata fields are performed through Cloudinary's metadata API and logged in the application's audit trail. Metadata queries are used by admin tools to find all assets of a specific type, all assets for a specific user, or all assets with a specific verification status.

---

## 9. Deletion Policy

Asset deletion follows a lifecycle policy based on the asset category and regulatory requirements. Deletion is always performed through the backend API, never directly through the Cloudinary API from the frontend. All deletions are logged in the audit trail with the asset ID, deletion timestamp, and operator.

**KYC documents** are retained for a minimum of 5 years from the date of KYC approval, in compliance with AML/KYC regulatory requirements across major jurisdictions. After the retention period, KYC documents are scheduled for deletion. The deletion process removes the asset from Cloudinary storage and records the deletion in the audit trail with the reason "regulatory retention period expired." Automated retention management runs monthly to identify and process expired KYC documents.

**User avatars** are deleted when the user's account is deleted, following the soft-delete grace period (30 days). If the user reactivates their account within the grace period, the avatar is preserved. After the grace period, the avatar is permanently deleted from Cloudinary. If the user had a custom avatar, it is replaced with the default system avatar during the soft-delete period.

**Gift card screenshots** are deleted 90 days after the associated deposit is verified and completed. The 90-day window allows for dispute resolution and audit review. After 90 days, the screenshot is no longer needed as the financial record is the source of truth. Deletion is performed by a scheduled background job that queries deposits verified more than 90 days ago and deletes the associated Cloudinary assets.

**Platform branding and email assets** are not subject to automatic deletion. These are managed through the deployment process and version-controlled in the application's asset repository. Old versions of branding assets may be manually archived or deleted during a rebranding exercise.

---

## 10. CDN & Performance

All Cloudinary assets are delivered through Cloudinary's global CDN, which provides edge caching at points of presence worldwide. This ensures that users in any region receive fast asset delivery with minimal latency. The CDN handles caching, compression, and format negotiation automatically based on the client's capabilities and location.

Cache-Control headers are configured at the Cloudinary level to optimize caching behavior. Public assets (branding, email images, default avatars) use aggressive caching with `Cache-Control: public, max-age=31536000, immutable` since these assets are versioned via their URL (including a version/hash component). Private assets use shorter cache durations appropriate to their signed URL expiration (1 hour for private, 30 minutes for authenticated).

URL-based transformations are the primary mechanism for image processing. All transformations (resize, crop, format conversion, quality optimization) are specified in the Cloudinary URL and executed at the CDN edge or Cloudinary's processing layer on first request. Subsequent requests for the same transformation are served from cache. This approach requires no server-side processing on every request — the application simply constructs the appropriate URL and the CDN/Cloudinary handles the rest.

Eager transformations are used for sizes that are known at upload time (avatar sizes, branding sizes) to avoid the processing latency on first request. On-demand transformations are used for sizes that cannot be predicted in advance or are used infrequently. The transformation cache at the CDN edge ensures that even on-demand transformations are fast after the first request.

---

## 11. Fallback Strategy

If Cloudinary becomes unavailable (service outage, API errors, network issues), the platform implements a graceful degradation strategy rather than failing hard. Upload functionality is temporarily disabled with a user-facing message: "File uploads are temporarily unavailable. Please try again later." The message is displayed in the UI wherever upload functionality is offered (avatar upload, KYC submission, gift card deposit).

Existing assets continue to be served from the CDN edge cache during a Cloudinary outage. Since Cloudinary's CDN caches assets at edge locations, previously accessed assets remain available even if the Cloudinary origin is unreachable. The cache TTL for public assets is long (1 year), providing significant resilience. For private/authenticated assets with shorter TTLs, there may be a period where re-authentication is needed, but recently accessed assets should still be available from cache.

Pending uploads that fail due to Cloudinary unavailability are queued for automatic retry. The backend implements a retry queue (backed by the background worker and Redis) that stores failed upload metadata and retries the upload at increasing intervals (1 minute, 5 minutes, 15 minutes, 1 hour) for up to 24 hours. After 24 hours, the upload is marked as failed and the user is notified to retry manually. The retry queue is persisted in Redis to survive application restarts.

The platform monitors Cloudinary availability through health check endpoints and uptime monitoring. If Cloudinary's error rate exceeds a threshold (5% of requests failing over a 5-minute window), the system automatically enters degradation mode, disabling uploads and serving cached assets. When the error rate returns to normal, the system automatically exits degradation mode. This automation ensures rapid response to Cloudinary issues without requiring manual intervention.