export interface SampleResume {
  id: string;
  label: string;
  roleTitle: string;
  experienceYears: number;
  highlightSkills: string[];
  text: string;
}

export const SAMPLE_TECH_RESUMES: SampleResume[] = [
  {
    id: "senior-fullstack",
    label: "Senior Full Stack & AI Engineer (6 YOE)",
    roleTitle: "Senior Full Stack Engineer",
    experienceYears: 6,
    highlightSkills: ["TypeScript", "Next.js", "React", "Node.js", "PostgreSQL", "AI/LLM API", "AWS"],
    text: `ALEX MORGAN
alex.morgan.tech@example.com | +1 (555) 234-5678 | San Francisco, CA (Open to Remote)
GitHub: github.com/alexmorgan | LinkedIn: linkedin.com/in/alexmorgan

SUMMARY
Senior Full-Stack Software Engineer with 6+ years of experience building high-scale distributed web applications, developer platforms, and AI-assisted tooling. Expert in TypeScript, Next.js, React, Node.js, PostgreSQL, and cloud infrastructure. Proven track record improving system latency by 40% and leading cross-functional engineering teams.

CORE SKILLS
- Languages: TypeScript, JavaScript, Python, Go, SQL, HTML5/CSS3
- Frontend: React 19, Next.js (App Router), Tailwind CSS, Redux Toolkit, Web Vitals, Responsive Design
- Backend & Systems: Node.js, Express, Fastify, REST & GraphQL APIs, WebSockets, Prisma ORM, Redis
- Databases & Storage: PostgreSQL, Neon, MySQL, MongoDB, Vector Databases (Pinecone, pgvector)
- Cloud & DevOps: AWS (ECS, Lambda, S3, RDS), Docker, CI/CD (GitHub Actions), Trigger.dev, Vercel
- AI & LLM Engineering: Gemini 2.5 API, Claude API, Prompt Engineering, Structured Outputs, Embeddings

WORK EXPERIENCE

Senior Software Engineer | CloudScale Technologies (Remote)
June 2022 – Present
- Architected and shipped a multi-tenant analytics dashboard in Next.js 14 and PostgreSQL serving 150k+ daily active users with sub-100ms response times.
- Designed AI-driven automated search workflows using LLM structured output parsing and asynchronous queue workers, reducing manual processing time by 75%.
- Led a team of 5 engineers across sprint planning, technical design reviews, and high-standard code quality enforcement.
- Optimized database indexing and connection pooling with Neon PgBouncer, eliminating peak-hour database contention.

Full-Stack Software Engineer | Nexus Software Inc. (San Francisco, CA)
August 2019 – May 2022
- Developed scalable RESTful microservices in Node.js and TypeScript handling over 2M requests per day.
- Re-architected legacy React frontend into a modular design system using Tailwind CSS and TypeScript, boosting lighthouse performance scores from 58 to 96.
- Implemented real-time collaborative workspace features using WebSockets and Redis pub/sub.
- Integrated automated CI/CD deployment pipelines on AWS ECS, cutting release cycle time from 2 hours to 8 minutes.

Junior Web Developer | Apex Digital (Austin, TX)
June 2018 – July 2019
- Built responsive customer portals and landing pages using React, HTML5, and CSS3.
- Integrated third-party payment gateways (Stripe) and authentication providers (OAuth 2.0).

EDUCATION
Bachelor of Science in Computer Science
University of California, Berkeley | 2014 – 2018

PROJECTS & OPEN SOURCE
- Dispatch Console: High-performance job search & AI matching engine built with Next.js App Router, Prisma, and Gemini 2.5.
- FastKV: Embedded high-throughput in-memory key-value store built in TypeScript with zero dependencies.`,
  },
  {
    id: "backend-distributed",
    label: "Backend & Distributed Systems Engineer (5 YOE)",
    roleTitle: "Backend Systems Engineer",
    experienceYears: 5,
    highlightSkills: ["Go", "Node.js", "PostgreSQL", "Redis", "Kafka", "Docker", "Kubernetes"],
    text: `JORDAN CHEN
jordan.chen.dev@example.com | +1 (555) 876-5432 | Bengaluru, India (Open to Remote)
GitHub: github.com/jordanchen | LinkedIn: linkedin.com/in/jordanchen

SUMMARY
Backend & Systems Software Engineer with 5 years of experience designing high-throughput microservices, event-driven pipelines, and relational database architectures. Specialized in Go, Node.js, PostgreSQL, Redis, and distributed consensus.

CORE TECHNICAL SKILLS
- Languages: Go (Golang), TypeScript, Node.js, Python, SQL
- Architecture: Microservices, Distributed Systems, Event-Driven Architecture, REST, gRPC
- Databases: PostgreSQL, Redis, Apache Kafka, Elasticsearch, DynamoDB
- Cloud & Infrastructure: AWS, Docker, Kubernetes, Terraform, GitHub Actions, Prometheus, Grafana

WORK EXPERIENCE

Senior Backend Engineer | DataStream Systems (Remote)
January 2023 – Present
- Designed high-throughput distributed transaction processing engine in Go and Kafka handling 50,000 events/sec with 99.99% uptime SLA.
- Scaled PostgreSQL read/write pipelines with connection pooling, multi-region replication, and partitioned tables.
- Implemented gRPC microservices and Redis distributed locks for zero-loss financial payment processing.

Backend Software Engineer | FinTech Innovations (Bengaluru)
July 2020 – December 2022
- Built core banking APIs and user authentication systems in Node.js, TypeScript, and PostgreSQL.
- Reduced API p99 latency from 320ms to 45ms by optimizing database indexing and introducing distributed cache warming.
- Created automated integration and regression test suites with 92% code coverage.

EDUCATION
Bachelor of Technology in Information Technology
National Institute of Technology | 2016 – 2020`,
  },
];
