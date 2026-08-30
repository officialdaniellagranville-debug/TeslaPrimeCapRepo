# Scalability Plan

**Project:** Enterprise Investment Platform
**Phase:** 1 — Discovery & Documentation
**Last Updated:** 2025
**Status:** Draft

---

## 1. Scaling Philosophy

This platform follows a deliberate vertical-first, horizontal-second scaling approach. The initial deployment targets a single Virtual Private Server (VPS) provisioned with sufficient resources to absorb early-stage traffic without the complexity of distributed infrastructure. This strategy keeps operational overhead low during the critical launch period while ensuring the architecture is ready for horizontal expansion when demand warrants it.

Every service in the stack is designed to be stateless from the outset. Session state, temporary caches, and rate-limiting counters are stored externally in Redis rather than in-process memory. This architectural decision means that any number of application instances can be spun up behind a load balancer without session affinity requirements or sticky sessions. Stateless design is the single most important prerequisite for cost-effective horizontal scaling.

The guiding principle is to scale when measurements indicate the need, not preemptively. Monitoring and observability infrastructure (logging, metrics, alerting) is deployed from day one so that capacity thresholds are visible in real time. Scaling decisions are data-driven, responding to actual load patterns rather than speculative projections.

---

## 2. Current Capacity Planning

The baseline single-server specification is an 8-core CPU, 16 GB RAM, and 200 GB SSD VPS. Based on benchmarking estimates for the technology stack, this configuration supports approximately 10,000 concurrent users, roughly 1,000 HTTP requests per second, and up to 100,000 registered user accounts in the database before performance degradation becomes noticeable.

These estimates are derived from the following per-operation latency assumptions: Next.js server-side rendering completes in approximately 50 ms per page request under normal load, API route handlers process typical CRUD operations in 100–200 ms including database round-trips, and PostgreSQL executes indexed queries in 20–50 ms. With connection pooling limiting the database to 20 concurrent connections and Redis caching frequently accessed data, the application server becomes the bottleneck well before the database does at this scale.

Memory consumption is estimated at roughly 150–200 MB per Node.js process under moderate load. With 16 GB of available RAM, the server can comfortably run 4–6 application processes, the PostgreSQL instance, Redis, and background workers simultaneously with headroom for traffic spikes. The 200 GB SSD provides ample storage for the database, logs, and Docker images through the first several months of operation.

---

## 3. Database Scaling

### Phase 1: Single PostgreSQL with Connection Pooling

The initial deployment uses a single PostgreSQL instance managed through Prisma's built-in connection pooler. Prisma's connection pool is configured with a maximum of 10–20 connections to prevent the database from being overwhelmed during traffic spikes. All queries are optimized with proper indexing, and the schema is designed to avoid N+1 query patterns from the start.

### Phase 2: Read Replicas

Reporting and analytics queries are the most common source of database load that does not require real-time consistency. A read replica is introduced to offload these queries from the primary database. The application routes read-only operations (dashboard statistics, transaction history, reports) to the replica while all writes and transactional reads continue to hit the primary. Prisma supports read replicas through replica configuration in the datasource block.

### Phase 3: PgBouncer and Table Partitioning

As connection demand grows, PgBouncer is introduced as a dedicated external connection pooler. PgBouncer's transaction-level pooling mode allows thousands of application-side connections to share a much smaller number of actual database connections, dramatically reducing PostgreSQL's memory and process overhead. The `transactions` table, which grows linearly with every deposit, withdrawal, and commission event, is partitioned by month using PostgreSQL's native declarative partitioning. This keeps individual partition sizes manageable and allows old partitions to be archived or dropped without affecting active data.

### Future: Horizontal Sharding

If the platform grows beyond what a single PostgreSQL instance with replicas can handle (e.g., millions of transactions per month), Citus or a similar extension provides horizontal sharding capabilities. This is a last-resort option that introduces significant operational complexity and is only justified when all vertical and replica-based scaling options have been exhausted. The schema should be designed with this possibility in mind by using a user-scoped shard key (e.g., `userId`) on all high-cardinality tables.

---

## 4. Redis Scaling

### Phase 1: Single Redis Instance

A single Redis instance handles all caching, session storage, rate limiting, and background job queue management. Redis is deployed as a Docker container with persistence enabled via RDB snapshots. This is sufficient for the initial user base and keeps the infrastructure simple. Key namespaces are organized logically (e.g., `cache:*`, `session:*`, `rate:*`, `queue:*`) to allow clean separation if instances are split later.

### Phase 2: Redis Sentinel for High Availability

Redis Sentinel provides automatic failover if the primary Redis instance becomes unavailable. A minimum three-node Sentinel deployment monitors the primary and promotes a replica to primary within seconds of a failure. This eliminates Redis as a single point of failure. Sessions and cache data survive failover with minimal disruption; queued jobs may need reprocessing depending on the exact failure window.

### Phase 3: Redis Cluster for Horizontal Scaling

When a single Redis instance's memory or throughput becomes a bottleneck, Redis Cluster distributes data across multiple nodes using hash-based sharding. Each shard handles a subset of keys, and the cluster handles cross-slot operations transparently. At this stage, it may also make sense to operate separate Redis instances for distinct workloads — one dedicated instance for caching (high-read, evictable), another for session storage (persistent, low-latency), and a third for job queues (persistent, ordered).

---

## 5. Application Scaling

### Frontend (Next.js)

Next.js server-side rendering is inherently stateless when session data is stored in Redis rather than in-memory. This means any number of Next.js instances can be deployed behind a load balancer with no session affinity requirement. Static pages and public routes benefit from Next.js's built-in incremental static regeneration (ISR), which reduces the need for repeated SSR computations. The Next.js build output is fully containerized, allowing horizontal scaling by simply adding more containers.

### Backend (API Routes)

All API route handlers are stateless — they receive a request, authenticate via JWT, read/write to the database or Redis, and return a response. No in-memory state is maintained between requests. This makes it trivial to scale horizontally: additional Node.js containers are added behind the load balancer, and each container handles an equal share of incoming traffic. Container orchestration (handled by Coolify) manages the lifecycle, health checks, and restart policies for these containers.

### Background Workers

Withdrawal processing, email sending, commission calculations, and other asynchronous tasks are handled by dedicated worker processes. These workers consume jobs from Redis-backed queues. Scaling workers is independent of scaling the web application: if the withdrawal queue grows deep, additional worker containers are added specifically for queue processing without affecting web request handling. This separation ensures that heavy background processing does not degrade the user-facing request latency.

---

## 6. File/Asset Scaling

All user-uploaded files (KYC documents, gift card screenshots, profile images) and platform media assets are stored exclusively on Cloudinary. Cloudinary provides built-in CDN delivery, on-the-fly image transformations, automatic format optimization (WebP/AVIF), and responsive image sizing. There is no local file storage in the application containers, which means containers are fully ephemeral and can be replaced or scaled without any file migration concerns.

Cloudinary's own infrastructure scales automatically with usage. There is no action required on our part to handle increased upload volumes or delivery traffic. The only consideration is cost management: Cloudinary charges based on storage volume, transformation operations, and bandwidth. Usage should be monitored through Cloudinary's dashboard and alerts configured for unexpected spikes that could indicate abuse or misconfiguration.

---

## 7. Load Balancing

### Phase 1: Built-in Traefik (Coolify)

Coolify deploys Traefik as its default reverse proxy and load balancer. Traefik automatically discovers new containers and routes traffic to them based on Docker labels. This requires zero configuration for basic round-robin load balancing across multiple application containers. Traefik also handles SSL termination via Let's Encrypt, HTTP to HTTPS redirection, and basic request routing.

### Phase 2: Dedicated Load Balancer

When the application requires more sophisticated traffic management (weighted routing, canary deployments, circuit breaking, or rate limiting at the proxy level), a dedicated Nginx or HAProxy instance is deployed in front of the application containers. This dedicated load balancer provides finer control over connection timeouts, request buffering, and traffic shaping. Health checks are configured to automatically remove unhealthy containers from the rotation.

### No Sticky Sessions Required

Because the entire application stack is stateless (sessions in Redis, no in-memory user state), sticky sessions are unnecessary. Any request can be served by any application instance. This eliminates a common scalability constraint and simplifies load balancer configuration, container replacement, and rolling deployments.

---

## 8. CDN Strategy

### Media Assets (Cloudinary CDN)

Cloudinary serves all uploaded and transformed media through its global CDN. Images are automatically delivered from the nearest edge location to the user, reducing latency regardless of geographic distance. Cloudinary also handles image optimization (compression, format conversion, responsive sizing) at the edge, further reducing bandwidth costs and improving page load times.

### Static Assets and DDoS Protection (Cloudflare)

A Cloudflare (or equivalent) layer sits in front of the application to serve static assets (JavaScript bundles, CSS, fonts, favicons) from its global CDN. This reduces the load on the origin server significantly, as the majority of requests for static assets never reach the application infrastructure. Cloudflare also provides DDoS mitigation, bot protection, and Web Application Firewall (WAF) rules that block malicious traffic before it reaches the application.

### GeoDNS for Global Latency Optimization

As the platform serves a global user base, GeoDNS ensures that users are routed to the nearest point of presence. In a single-region deployment, this primarily reduces DNS resolution latency. In a multi-region deployment (Phase 2+), GeoDNS directs users to the nearest application region, minimizing round-trip times for dynamic requests.

---

## 9. Auto-Scaling Triggers

Auto-scaling is implemented through container orchestration rules that monitor key system metrics and adjust the number of running application containers accordingly. The following triggers are configured:

| Metric | Threshold | Duration | Action |
|--------|-----------|----------|--------|
| CPU Utilization | > 70% | 5 minutes | Scale up (+1 container) |
| Memory Utilization | > 75% | 5 minutes | Scale up (+1 container) |
| Request Queue Depth | > 100 pending | 1 minute | Scale up (+1 container) |
| Response Time (P95) | > 1,000 ms | 5 minutes | Scale up (+1 container) |
| CPU Utilization | < 30% | 15 minutes | Scale down (−1 container, min 2) |

Scale-up actions add one container at a time to avoid over-provisioning. Scale-down actions are more conservative (longer duration threshold, minimum container floor of 2) to prevent oscillation during temporary load dips. The request queue depth trigger is the most responsive, designed to catch sudden traffic spikes before they manifest as high CPU or latency.

All scaling events are logged and emitted as alerts so that the operations team can monitor scaling patterns and adjust thresholds if the system scales too aggressively or too conservatively for actual traffic patterns.

---

## 10. Geographic Scaling

### Phase 1: Single Region

The initial deployment runs entirely within a single data center region. All users, regardless of geographic location, connect to this region. Cloudflare's CDN and Cloudinary's CDN mitigate the latency impact for static and media content. Dynamic API requests will have higher latency for users far from the selected region, but this is acceptable for the launch phase.

### Phase 2: Multi-Region with Database Replication

When a significant portion of the user base is concentrated in a different geographic region, a second application region is deployed. PostgreSQL streaming replication keeps the secondary region's database read replica in sync with the primary. Users in the secondary region are served by local application instances and read from the local replica. Writes are still routed to the primary region, introducing write latency for secondary region users — this is acceptable because write operations (deposits, withdrawals, profile updates) are far less frequent than reads.

### Phase 3: Edge Computing

For fully static and cacheable content (landing pages, terms of service, plan descriptions, FAQ), edge computing (Cloudflare Workers or Vercel Edge Functions) serves content from the nearest edge location with sub-10ms latency. Authentication-required content still routes to the nearest application region, but the percentage of requests requiring full server processing is reduced through aggressive caching of public pages.

---

## 11. Cost Scaling

The following table estimates monthly infrastructure costs at different user scale levels. These are rough estimates based on typical VPS/cloud provider pricing and assume reasonable optimization.

| Scale | Registered Users | Est. Monthly Cost | Key Components |
|-------|-----------------|-------------------|----------------|
| Bootstrap | 1,000 | $50–$100 | Single VPS, managed PostgreSQL, Redis, Cloudinary free tier, Resend free tier |
| Growth | 10,000 | $200–$400 | Upgraded VPS (or 2× VPS), managed PostgreSQL, Redis Sentinel, Cloudinary Pro, Resend Pro, Cloudflare Pro |
| Scale | 100,000 | $800–$2,000 | 3–5 application servers, managed PostgreSQL + replica, Redis Cluster, Cloudinary Advanced, monitoring (Sentry/Datadog) |
| Enterprise | 1,000,000 | $3,000–$8,000 | Multi-region deployment, database cluster, dedicated load balancer, premium CDN, 24/7 monitoring, security services |

Cost components at each tier include: server/compute, managed database, Redis, CDN (Cloudflare), media processing (Cloudinary), transactional email (Resend), monitoring and alerting, and SSL certificates. The largest cost jump occurs between the Growth and Scale tiers when database replication and multi-server deployments become necessary.

These estimates deliberately exclude personnel costs, legal/compliance costs, and marketing expenses. They represent pure infrastructure costs for running the platform. Actual costs may vary based on geographic region, provider pricing changes, and specific traffic patterns.

---

## 12. Bottleneck Analysis

### Financial Transaction Serialization

Financial operations (deposits, withdrawals, commission calculations) must be processed serially to maintain data integrity and prevent double-spending or race conditions. If processed synchronously in the API request path, this would create a significant bottleneck under load. **Mitigation:** All financial operations are placed into Redis-backed queues and processed asynchronously by dedicated worker processes. The API responds immediately with a "pending" status, and the user is notified via in-app notification and email once processing completes. This decouples request throughput from transaction processing throughput.

### Database Connection Pool Exhaustion

Under high concurrency, the database connection pool can become exhausted, causing new requests to queue or fail. This is particularly dangerous during traffic spikes when many users are active simultaneously. **Mitigation:** Connection pooling via Prisma and (in later phases) PgBouncer limits and efficiently manages database connections. Read replicas offload reporting queries. Query optimization and proper indexing reduce per-query connection hold time. Connection pool metrics are monitored and alert on approaching limits.

### Report Generation

Admin reports (financial summaries, user growth, commission breakdowns) can involve complex aggregation queries across large datasets. If executed synchronously, these queries can consume disproportionate database resources and block other operations. **Mitigation:** Report generation is processed asynchronously — the admin requests a report, the system queues the job, and the result is cached and delivered once complete. Frequently requested reports are cached in Redis with appropriate TTL values. Pre-computed materialized views or scheduled summary tables can further reduce query complexity for common report types.

### Gift Card Verification Latency

Gift card deposits require manual or semi-automated verification, which introduces inherent latency. During high-volume periods, the verification queue can grow, causing delayed credits and user dissatisfaction. **Mitigation:** Admin verification interface is prioritized in the admin dashboard with clear queue depth indicators. Automated fraud scoring pre-filters submissions, allowing admins to focus on borderline cases. Clear user communication sets expectations around verification timelines.