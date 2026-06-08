import { Stage, Lead } from "./types";

export const STAGES: Stage[] = [
  {
    name: "Lead Discovery",
    icon: "search",
    eta: 45,
    desc: "Extracts geographic coordinates and Maps data to build the initial lead dossier.",
    data: {
      "Target Area": "Lahore, Pakistan",
      "API Status": "Online / OK",
      "Scrape Mode": "Grid-Search (80 Blocks)",
      "Categories Collected": "Dentist, Dental Clinic",
      "Coordinates Parsed": "31.5204° N, 74.3587° E",
      "Total Identified Leads": "142 raw listings"
    }
  },
  {
    name: "Lead Auditor",
    icon: "fact_check",
    eta: 120,
    desc: "Scrapes GBP completeness signals and runs PageSpeed lab metrics to calculate overall score.",
    data: {
      "Audit Engine": "Playwright Headless + PSI v5",
      "Description Match": "Description missing or < 100 chars",
      "Photos Target": "Verify threshold > 10 images",
      "PageSpeed Callout": "Mobile: 60/100 | Desktop: 88/100"
    }
  },
  {
    name: "Reviews Scraper",
    icon: "reviews",
    eta: 90,
    desc: "Harvests user reviews and sentiment data to build a reputation profile.",
    data: {
      "Scraper Status": "Active - Pro Version",
      "Target Threads": "5 Parallel Workers",
      "Scraped Reviews": "850 comments harvested",
      "Avg User Rating": "4.2 / 5.0"
    }
  },
  {
    name: "Summarize Info",
    icon: "auto_awesome",
    eta: 60,
    desc: "Processes raw data into actionable business summaries.",
    data: {
      "Summary model": "llama-3.3-70b-versatile",
      "Process duration": "3.5s per review pack",
      "Fenced Parsing": "Sanitized JSON braces",
      "Analysis Status": "Complete"
    }
  },
  {
    name: "Rank Tracker",
    icon: "leaderboard",
    eta: 180,
    desc: "Monitors search engine visibility and keyword positioning.",
    data: {
      "Engine": "SeleniumBase UC Chrome",
      "Keywords Generated": "14 high-intent phrases",
      "Best Local Index": "#2 (Dentist near me)",
      "CAPTCHA Safety": "Active - Unattended solver"
    }
  },
  {
    name: "Website Crawler",
    icon: "language",
    eta: 300,
    desc: "Deep-scans website infrastructure for technical SEO signals.",
    data: {
      "Crawler Type": "Crawl4AI + AsyncWebCrawler",
      "Link Depth": "Max 3 levels inside domain",
      "Content Check": "Minimum 500 chars required",
      "Blocklist Status": "Social networks excluded"
    }
  },
  {
    name: "SEO Deep Audit",
    icon: "query_stats",
    eta: 150,
    desc: "Identifies site health issues and conversion optimization gaps.",
    data: {
      "Analyzers Loaded": "HTTPS, CTA, Blog presence",
      "Broken Links Scanned": "30 URLs (8s timeout limit)",
      "CTA Status": "No prominent button identified",
      "Structured Markup": "Schema.org verification failed"
    }
  },
  {
    name: "Neighbour Finder",
    icon: "map",
    eta: 45,
    desc: "Maps local competitive landscape and market share.",
    data: {
      "Computation Mode": "Haversine distance matrix",
      "Locality Group Size": "N=5 neighbors nearby",
      "Density Status": "Highly congested hub",
      "Distance Range": "0.3km - 2.5km radius"
    }
  },
  {
    name: "SEO Report",
    icon: "description",
    eta: 75,
    desc: "Generates comprehensive PDF reports with scoring metrics.",
    data: {
      "Generation Engine": "Groq gpt-oss-120b compiler",
      "Sections Active": "Performance, GBP, Technical, Competitors, Content",
      "Executive Grade": "Computed Weight = C (62%)",
      "Format Generated": "Self-contained dark HTML template"
    }
  },
  {
    name: "SEO Outreach",
    icon: "outgoing_mail",
    eta: 30,
    desc: "Automates personalized outreach and tracks revenue impact.",
    data: {
      "Outreach Engine": "Gmail SMTP + IME",
      "CC Option": "active (admin copy)",
      "Target Address": "info@adpdentist.com",
      "Projected Impact": "PKR 250k - 400k revenue gain"
    }
  }
];

export const DENTIST_LEADS: Lead[] = [
  {
    id: "lead-1",
    name: "Advanced Dental Practice",
    location: "Lahore",
    rating: 4.5,
    reviewsCount: 55,
    phone: "924235756145",
    website: "adpdentist.com",
    hasWebsite: true,
    filteredByCriteria: true,
    filteredByCriteriaWithWebsite: true,
    seoGrade: "C",
    seoGradeTrend: "down",
    gbpScore: 33,
    gbpStatus: "Critical",
    mobileSpeed: 60,
    mobileSeo: 82,
    revenueImpact: "PKR 250k-400k",
    missingItems: [
      { name: "Business hours", severity: "critical" },
      { name: "Photos", severity: "critical" },
      { name: "Q&A section", severity: "warning" },
      { name: "Service areas", severity: "warning" }
    ],
    competitors: [
      { name: "De Dental Pro", distance: "0.3km away" },
      { name: "Prime Care Dental", distance: "0.7km away" }
    ],
    technicalHealth: [
      {
        title: "CRITICAL: No HTTPS detected",
        subtext: "Site is currently marked as 'Not Secure' in Google Chrome, destroying organic user faith.",
        severity: "critical"
      },
      {
        title: "Mobile LCP: 6.2s",
        subtext: "Largest Contentful Paint exceeds recommended 2.5s. Many mobile seekers bounce away.",
        severity: "critical"
      },
      {
        title: "Incomplete Open Graph Description",
        subtext: "Social sharing layouts appear truncated or empty, causing suboptimal listing card presentation.",
        severity: "warning"
      }
    ],
    reviews: [
      {
        author: "Ali Khan",
        rating: 5.0,
        date: "3 weeks ago",
        text: "Very modern clinic. Dr. Omar was extremely gentle and explained everything in detail. Highly recommended!"
      },
      {
        author: "Zainab Bibi",
        rating: 3.0,
        date: "1 month ago",
        text: "Clinical care is good, but finding their opening hours or getting through on the phone is extremely frustrating."
      },
      {
        author: "Muhammad Rizwan",
        rating: 4.0,
        date: "2 months ago",
        text: "Had a routine clean. Professional staff, though the waiting time was about 20 minutes past my appointment."
      },
      {
        author: "Dr. Bilal Naeem",
        rating: 5.0,
        date: "2 months ago",
        text: "Excellent orthodontic treatment. Very satisfied with the braces result."
      },
      {
        author: "Huma Qureshi",
        rating: 4.0,
        date: "3 months ago",
        text: "Staff is super professional, but getting a slot on Saturdays is extremely difficult."
      }
    ],
    reviewSummary: {
      status: "mixed",
      business_status: "positive",
      summary: "Most patients praise the modern equipment and clinical expertise. However, a significant number of reviews complain about missing contact info, unlisted hours, and long wait times.",
      recurringIssues: [
        { issue: "Unlisted business hours", count: 8 },
        { issue: "Phone connection issues", count: 4 },
        { issue: "Appointment delays", count: 3 }
      ],
      isolated_incidents: [
        { issue: "Not recommended", count: 1, summary: "A customer gave a 1-star rating and stated the practice is 'highly not recommended'." }
      ],
      total_issue_count: 16
    },
    gbpAuditRaw: {
      "description": null,
      "opening_date": null,
      "photos_count": null,
      "has_menu": true,
      "attributes": null,
      "qa_count": null,
      "has_google_posts": false,
      "service_areas": null,
      "signals": {
            "has_phone": true,
            "has_website": true,
            "has_hours": false,
            "has_address": true,
            "has_description": false,
            "has_photos": false,
            "photos_enough": false,
            "has_categories": true,
            "has_attributes": false,
            "has_menu": true,
            "has_qa": false,
            "has_google_posts": false,
            "has_opening_date": false,
            "has_service_areas": false
      },
      "completeness_score": 33,
      "missing_items": [
            "Business hours",
            "Business description",
            "Photos",
            "At least 10 photos",
            "Attributes (Wi-Fi, accessibility, payments\u2026)",
            "Q&A section",
            "Google Posts / Updates",
            "Opening / established date",
            "Service areas"
      ]
},
    pagespeedRaw: {
      "url": "http://www.adpdentist.com/",
      "checked_at": {
            "$date": "2026-06-03T07:28:29.734Z"
      },
      "source": "psi_api",
      "mobile": {
            "strategy": "mobile",
            "status": "success",
            "lab": {
                  "score": 60,
                  "fcp_ms": 4082.12,
                  "fcp": "4.1\u00a0s",
                  "lcp_ms": 6211.19,
                  "lcp": "6.2\u00a0s",
                  "tbt_ms": 0,
                  "tbt": "0\u00a0ms",
                  "cls": 0.05,
                  "cls_display": "0.048",
                  "si_ms": 10650.55,
                  "si": "10.7\u00a0s",
                  "tti_ms": 6256.19,
                  "tti": "6.3\u00a0s"
            },
            "field_data": {},
            "opportunities": [
                  {
                        "id": "server-response-time",
                        "title": "Reduce initial server response time",
                        "savings_ms": 4915
                  },
                  {
                        "id": "redirects",
                        "title": "Avoid multiple page redirects",
                        "savings_ms": 630
                  },
                  {
                        "id": "unused-css-rules",
                        "title": "Reduce unused CSS",
                        "savings_ms": 300
                  },
                  {
                        "id": "unused-javascript",
                        "title": "Reduce unused JavaScript",
                        "savings_ms": 150
                  }
            ]
      },
      "desktop": {
            "strategy": "desktop",
            "status": "success",
            "lab": {
                  "score": 87,
                  "fcp_ms": 922.07,
                  "fcp": "0.9\u00a0s",
                  "lcp_ms": 1337.89,
                  "lcp": "1.3\u00a0s",
                  "tbt_ms": 0,
                  "tbt": "0\u00a0ms",
                  "cls": 0.02,
                  "cls_display": "0.021",
                  "si_ms": 3621.53,
                  "si": "3.6\u00a0s",
                  "tti_ms": 1347.03,
                  "tti": "1.3\u00a0s"
            },
            "field_data": {},
            "opportunities": [
                  {
                        "id": "server-response-time",
                        "title": "Reduce initial server response time",
                        "savings_ms": 4275
                  },
                  {
                        "id": "redirects",
                        "title": "Avoid multiple page redirects",
                        "savings_ms": 190
                  },
                  {
                        "id": "unused-css-rules",
                        "title": "Reduce unused CSS",
                        "savings_ms": 50
                  },
                  {
                        "id": "unused-javascript",
                        "title": "Reduce unused JavaScript",
                        "savings_ms": 10
                  },
                  {
                        "id": "unminified-css",
                        "title": "Minify CSS",
                        "savings_ms": 10
                  }
            ]
      },
      "overall_status": "success"
},
    lighthouseSeoRaw: {
      "url": "http://www.adpdentist.com/",
      "status": "success",
      "score": 92,
      "passed_count": 8,
      "failed_count": 1,
      "failed_audits": [
            {
                  "id": "robots-txt",
                  "label": "robots.txt has errors",
                  "title": "robots.txt is not valid"
            }
      ],
      "checked_at": {
            "$date": "2026-06-04T10:14:29.009Z"
      },
      "source": "psi_api"
},
    websiteCrawlRaw: {
      "crawled_at": {
            "$date": "2026-06-03T07:50:19.031Z"
      },
      "url": "http://www.adpdentist.com/",
      "success": true,
      "title": "Advanced Dental Practice - Your Complete Care Center - Advanced Dental Practice",
      "description": "Advanced Dental Practice - Your complete care center for dental treatments and aesthetic services in Lahore. Expert dentists and aesthetic specialists.",
      "html": null,
      "cleaned_html": null,
      "markdown": null,
      "markdown_length": 17495,
      "fit_markdown": null,
      "metadata": {
            "title": "Advanced Dental Practice - Your Complete Care Center - Advanced Dental Practice",
            "description": "Advanced Dental Practice - Your complete care center for dental treatments and aesthetic services in Lahore. Expert dentists and aesthetic specialists.",
            "keywords": "dentist, dental clinic, aesthetic center, lahore",
            "author": "Advanced Dental Practice"
      },
      "links": {
            "internal": [
                  {
                        "href": "https://www.adpdentist.com/",
                        "text": "Skip to main content",
                        "title": "",
                        "base_domain": "adpdentist.com",
                        "head_data": null,
                        "head_extraction_status": null,
                        "head_extraction_error": null,
                        "intrinsic_score": 0,
                        "contextual_score": null,
                        "total_score": null
                  },
                  {
                        "href": "https://www.adpdentist.com/dental/services",
                        "text": "Dental Care",
                        "title": "",
                        "base_domain": "adpdentist.com",
                        "head_data": null,
                        "head_extraction_status": null,
                        "head_extraction_error": null,
                        "intrinsic_score": 0,
                        "contextual_score": null,
                        "total_score": null
                  },
                  {
                        "href": "https://www.adpdentist.com/dental/team",
                        "text": "Team",
                        "title": "",
                        "base_domain": "adpdentist.com",
                        "head_data": null,
                        "head_extraction_status": null,
                        "head_extraction_error": null,
                        "intrinsic_score": 0,
                        "contextual_score": null,
                        "total_score": null
                  },
                  {
                        "href": "https://www.adpdentist.com/aesthetic/services",
                        "text": "Aesthetic",
                        "title": "",
                        "base_domain": "adpdentist.com",
                        "head_data": null,
                        "head_extraction_status": null,
                        "head_extraction_error": null,
                        "intrinsic_score": 0,
                        "contextual_score": null,
                        "total_score": null
                  },
                  {
                        "href": "https://www.adpdentist.com/aesthetic/team",
                        "text": "Team",
                        "title": "",
                        "base_domain": "adpdentist.com",
                        "head_data": null,
                        "head_extraction_status": null,
                        "head_extraction_error": null,
                        "intrinsic_score": 0,
                        "contextual_score": null,
                        "total_score": null
                  }
            ],
            "external": [
                  {
                        "href": "tel:04235756145",
                        "text": "042-357-56145",
                        "title": "",
                        "base_domain": "",
                        "head_data": null,
                        "head_extraction_status": null,
                        "head_extraction_error": null,
                        "intrinsic_score": 0,
                        "contextual_score": null,
                        "total_score": null
                  },
                  {
                        "href": "https://www.linkedin.com/in/dr-hamza-hashim",
                        "text": "",
                        "title": "",
                        "base_domain": "linkedin.com",
                        "head_data": null,
                        "head_extraction_status": null,
                        "head_extraction_error": null,
                        "intrinsic_score": 0,
                        "contextual_score": null,
                        "total_score": null
                  },
                  {
                        "href": "https://www.facebook.com/Advanced.Dental.Practice.Lahore",
                        "text": "",
                        "title": "",
                        "base_domain": "facebook.com",
                        "head_data": null,
                        "head_extraction_status": null,
                        "head_extraction_error": null,
                        "intrinsic_score": 0,
                        "contextual_score": null,
                        "total_score": null
                  },
                  {
                        "href": "https://www.instagram.com/advanceddentalpractice",
                        "text": "",
                        "title": "",
                        "base_domain": "instagram.com",
                        "head_data": null,
                        "head_extraction_status": null,
                        "head_extraction_error": null,
                        "intrinsic_score": 0,
                        "contextual_score": null,
                        "total_score": null
                  },
                  {
                        "href": "https://www.instagram.com/zee.aesthetics.uk",
                        "text": "",
                        "title": "Instagram",
                        "base_domain": "instagram.com",
                        "head_data": null,
                        "head_extraction_status": null,
                        "head_extraction_error": null,
                        "intrinsic_score": 0,
                        "contextual_score": null,
                        "total_score": null
                  }
            ]
      },
      "media": {
            "images": [
                  {
                        "src": "/uploads/doctors/doctor_1_69ddc3ccc5106.jpg",
                        "data": "",
                        "alt": "Dr. M. Hamza Hashim",
                        "desc": "Dr. M. Hamza Hashim\n                                    Oral & Maxillofacial Surgeon\n                                    BDS, MDS \u00b7 Founder \u00b7 15+ yrs\n                                \n                                \n                                    \n                                \n                            \n\n                            \n                            \n                                \n                                    Dr. Zee Rutba Tariq\n                                    Aesthetic Consultant & Orthodontics\n                                    BDS, Dip. Aesthetic Medicine",
                        "score": 5,
                        "type": "image",
                        "group_id": 1,
                        "format": "jpg",
                        "width": null
                  },
                  {
                        "src": "/uploads/doctors/doctor_2_69ddc3d947f34.jpg",
                        "data": "",
                        "alt": "Dr. Zee Rutba Tariq",
                        "desc": "Dr. M. Hamza Hashim\n                                    Oral & Maxillofacial Surgeon\n                                    BDS, MDS \u00b7 Founder \u00b7 15+ yrs\n                                \n                                \n                                    \n                                \n                            \n\n                            \n                            \n                                \n                                    Dr. Zee Rutba Tariq\n                                    Aesthetic Consultant & Orthodontics\n                                    BDS, Dip. Aesthetic Medicine",
                        "score": 5,
                        "type": "image",
                        "group_id": 2,
                        "format": "jpg",
                        "width": null
                  },
                  {
                        "src": "/uploads/doctors/doctor_1_69ddc3ccc5106.jpg",
                        "data": "",
                        "alt": "Dr. M. Hamza Hashim",
                        "desc": "Founder & Lead Surgeon",
                        "score": 5,
                        "type": "image",
                        "group_id": 5,
                        "format": "jpg",
                        "width": null
                  },
                  {
                        "src": "/assets/images/clinic.jpg",
                        "data": "",
                        "alt": "About Our Clinic",
                        "desc": "15+\n                        Years of Excellence",
                        "score": 5,
                        "type": "image",
                        "group_id": 6,
                        "format": "jpg",
                        "width": null
                  },
                  {
                        "src": "/uploads/doctors/doctor_1_69ddc3ccc5106.jpg",
                        "data": "",
                        "alt": "Dr. M. Hamza Hashim",
                        "desc": "Dr. M. Hamza Hashim\n                        BDS, MDS Oral & Maxillofacial Surgery\n                        Oral & Maxillofacial Surgeon\n                        Founder of ADP with 15+ years of experience. Specialist in oral surgery, dental implants, facial aesthetics. Assistant Professor at Avicenna Dental College.\n                        View Profile",
                        "score": 5,
                        "type": "image",
                        "group_id": 7,
                        "format": "jpg",
                        "width": null
                  }
            ],
            "videos": [],
            "audios": []
      },
      "status_code": 307,
      "response_headers": {
            "location": "https://www.adpdentist.com/",
            "non-authoritative-reason": "HttpsUpgrades"
      },
      "seo": {
            "title": "Advanced Dental Practice - Your Complete Care Center - Advanced Dental Practice",
            "title_length": 79,
            "meta_description": "Advanced Dental Practice - Your complete care center for dental treatments and aesthetic services in Lahore. Expert dentists and aesthetic specialists.",
            "meta_description_length": 151,
            "meta_robots": null,
            "meta_viewport": "width=device-width, initial-scale=1.0",
            "meta_keywords": "dentist, dental clinic, aesthetic center, lahore",
            "meta_author": "Advanced Dental Practice",
            "canonical_url": null,
            "lang": "en",
            "hreflang": [],
            "has_favicon": true,
            "open_graph": {
                  "title": null,
                  "description": null,
                  "image": null,
                  "type": null,
                  "url": null,
                  "site_name": null
            },
            "twitter_card": {
                  "card": null,
                  "title": null,
                  "description": null,
                  "image": null
            },
            "headings": {
                  "h1_count": 1,
                  "h1_text": "Your CompleteCare Center",
                  "structure": {
                        "h1": [
                              "Your CompleteCare Center"
                        ],
                        "h2": [
                              "Dr. M. Hamza Hashim",
                              "Two Centers of Excellence,One Commitment to Care",
                              "Choose Your Path toBetter Health",
                              "Meet OurSpecialists",
                              "ComprehensiveDental Care",
                              "Transform Your Beauty withPremium Aesthetics",
                              "What Makes UsDifferent",
                              "Stay Connected onInstagram",
                              "Ready to Transform Your Smile?"
                        ],
                        "h3": [
                              "Dental Care",
                              "Aesthetic Center",
                              "Quick Links",
                              "Dental Care",
                              "Aesthetic Center",
                              "@advanceddentalpractice",
                              "@zee.aesthetics.uk"
                        ],
                        "h4": [
                              "Dental Care",
                              "Aesthetic Center",
                              "Dr. M. Hamza Hashim",
                              "Dr. Zee Rutba Tariq",
                              "Crowns & Bridges",
                              "Dental Fillings & Restorations",
                              "Dental Implants",
                              "Metal Braces",
                              "Teeth Whitening",
                              "Veneers & Laminates",
                              "Chemical Peels",
                              "Hydra Facial Plain",
                              "Microneedling with PRP (Hair)",
                              "Weight Loss Program",
                              "Hydra Facial 14 Steps",
                              "Microneedling with PRP & Mesotherapy (Hair)",
                              "@advanceddentalpractice",
                              "@zee.aesthetics.uk"
                        ],
                        "h5": [
                              "Expert Specialists",
                              "Advanced Technology",
                              "Patient-Centered Care",
                              "Safe & Sterile Environment"
                        ],
                        "h6": []
                  }
            },
            "images": {
                  "total": 47,
                  "with_alt": 45,
                  "missing_alt": 2
            },
            "links": {
                  "internal_count": 72,
                  "external_count": 15
            },
            "schema_org": {
                  "has_structured_data": false,
                  "types": []
            },
            "contact_signals": {
                  "phones": [
                        "0"
                  ],
                  "emails": []
            }
      },
      "screenshot_path": null,
      "error": null,
      "skipped_reason": null
},
    seoAuditRaw: {
      "https": {
            "detected": false,
            "evidence": "URL uses HTTP: http://www.adpdentist.com/"
      },
      "social_media": {
            "detected": true,
            "platforms": [
                  "facebook",
                  "instagram",
                  "linkedin",
                  "whatsapp"
            ],
            "evidence": [
                  "https://www.facebook.com/Advanced.Dental.Practice.Lahore",
                  "https://www.instagram.com/advanceddentalpractice",
                  "https://www.linkedin.com/in/dr-hamza-hashim",
                  "https://wa.me/923124422200"
            ],
            "count": 4
      },
      "blog": {
            "detected": false,
            "evidence": null
      },
      "broken_links": {
            "checked": 30,
            "broken_count": 1,
            "broken_urls": [
                  "https://www.linkedin.com/in/dr-hamza-hashim"
            ],
            "all_results": [
                  {
                        "url": "https://www.adpdentist.com/#main-content",
                        "status": 200,
                        "broken": false
                  },
                  {
                        "url": "https://www.adpdentist.com/assets/images/logo.jpg",
                        "status": 200,
                        "broken": false
                  },
                  {
                        "url": "https://www.adpdentist.com/",
                        "status": 200,
                        "broken": false
                  },
                  {
                        "url": "https://www.adpdentist.com/dental/services",
                        "status": 200,
                        "broken": false
                  },
                  {
                        "url": "https://www.adpdentist.com/dental/team",
                        "status": 200,
                        "broken": false
                  },
                  {
                        "url": "https://www.adpdentist.com/aesthetic/services",
                        "status": 200,
                        "broken": false
                  },
                  {
                        "url": "https://www.adpdentist.com/aesthetic/team",
                        "status": 200,
                        "broken": false
                  },
                  {
                        "url": "https://www.adpdentist.com/doctors",
                        "status": 200,
                        "broken": false
                  },
                  {
                        "url": "https://www.adpdentist.com/about",
                        "status": 200,
                        "broken": false
                  },
                  {
                        "url": "https://www.adpdentist.com/contact",
                        "status": 200,
                        "broken": false
                  },
                  {
                        "url": "https://www.adpdentist.com/uploads/doctors/doctor_1_69ddc3ccc5106.jpg",
                        "status": 200,
                        "broken": false
                  },
                  {
                        "url": "https://www.adpdentist.com/uploads/doctors/doctor_2_69ddc3d947f34.jpg",
                        "status": 200,
                        "broken": false
                  },
                  {
                        "url": "https://www.adpdentist.com/doctor/dr-hamza-hashim",
                        "status": 200,
                        "broken": false
                  },
                  {
                        "url": "https://www.adpdentist.com/doctor/dr-zee-rutba",
                        "status": 200,
                        "broken": false
                  },
                  {
                        "url": "https://www.adpdentist.com/#founder-section",
                        "status": 200,
                        "broken": false
                  },
                  {
                        "url": "https://www.linkedin.com/in/dr-hamza-hashim",
                        "status": 405,
                        "broken": true
                  },
                  {
                        "url": "https://www.facebook.com/Advanced.Dental.Practice.Lahore",
                        "status": 200,
                        "broken": false
                  },
                  {
                        "url": "https://www.instagram.com/advanceddentalpractice",
                        "status": 200,
                        "broken": false
                  },
                  {
                        "url": "https://www.adpdentist.com/assets/images/clinic.jpg",
                        "status": 200,
                        "broken": false
                  },
                  {
                        "url": "https://images.unsplash.com/photo-1606811971618-4486d14f3f99?w=800&auto=format&fit=crop",
                        "status": 200,
                        "broken": false
                  },
                  {
                        "url": "https://www.adpdentist.com/dental/service/crowns-bridges",
                        "status": 200,
                        "broken": false
                  },
                  {
                        "url": "https://www.adpdentist.com/assets/images/services/dental-fillings.jpg",
                        "status": 200,
                        "broken": false
                  },
                  {
                        "url": "https://www.adpdentist.com/dental/service/fillings-restorations",
                        "status": 200,
                        "broken": false
                  },
                  {
                        "url": "https://images.unsplash.com/photo-1579684385127-1ef15d508118?w=800&auto=format&fit=crop",
                        "status": 200,
                        "broken": false
                  },
                  {
                        "url": "https://www.adpdentist.com/dental/service/dental-implants",
                        "status": 200,
                        "broken": false
                  },
                  {
                        "url": "https://images.unsplash.com/photo-1598256989800-fe5f95da9787?w=800&auto=format&fit=crop",
                        "status": 200,
                        "broken": false
                  },
                  {
                        "url": "https://www.adpdentist.com/dental/service/metal-braces",
                        "status": 200,
                        "broken": false
                  },
                  {
                        "url": "https://www.adpdentist.com/assets/images/services/teeth-whitening.jpg",
                        "status": 200,
                        "broken": false
                  },
                  {
                        "url": "https://www.adpdentist.com/dental/service/teeth-whitening",
                        "status": 200,
                        "broken": false
                  },
                  {
                        "url": "https://www.adpdentist.com/assets/images/services/veneers.jpg",
                        "status": 200,
                        "broken": false
                  }
            ]
      },
      "cta": {
            "detected": true,
            "evidence": "Call Us Now 042-357-56145",
            "type": "link"
      },
      "booking": {
            "detected": false,
            "evidence": null,
            "platform": null
      },
      "llm_error": null,
      "audited_at": {
            "$date": "2026-06-03T07:51:20.302Z"
      }
},
    neighboursRaw: {
      "locality_group": [
            {
                  "place_id": "ChIJrQbZYfcEGTkRTQvLTgvLlng",
                  "name": "De Dental Pro",
                  "reviews_count": 33,
                  "rating": 4.9,
                  "website": "http://www.dedentalpro.com.pk/",
                  "distance_km": 0.349
            },
            {
                  "place_id": "ChIJIUZjZloDGTkR0zoMA8MKvAQ",
                  "name": "Prime Care Dental, Braces, Implants, Cosmetic and Surgical Dentistry",
                  "reviews_count": 72,
                  "rating": 4.9,
                  "website": "http://primecaredental.pk/",
                  "distance_km": 0.717
            },
            {
                  "place_id": "ChIJtUSIQyIFGTkR8_qxYfH-XWE",
                  "name": "Shamza Dental Care, Akram Medical Complex",
                  "reviews_count": 44,
                  "rating": 5,
                  "website": "https://shamzadentalcare.com/",
                  "distance_km": 1.332
            },
            {
                  "place_id": "ChIJL0kh1B8FGTkR5A5V0GKQDss",
                  "name": "Teeth and Smile Dental Clinic",
                  "reviews_count": 167,
                  "rating": 4.9,
                  "website": "https://teethandsmile.pk/",
                  "distance_km": 1.408
            },
            {
                  "place_id": "ChIJ0aW24zAFGTkRLgw5Bp2Z7uE",
                  "name": "Dental Sense Clinic",
                  "reviews_count": 69,
                  "rating": 4.9,
                  "website": "http://dentalsense.pk/",
                  "distance_km": 1.826
            }
      ],
      "top_3": [
            {
                  "place_id": "ChIJrQbZYfcEGTkRTQvLTgvLlng",
                  "name": "De Dental Pro",
                  "reviews_count": 33,
                  "rating": 4.9,
                  "website": "http://www.dedentalpro.com.pk/",
                  "distance_km": 0.349
            },
            {
                  "place_id": "ChIJIUZjZloDGTkR0zoMA8MKvAQ",
                  "name": "Prime Care Dental, Braces, Implants, Cosmetic and Surgical Dentistry",
                  "reviews_count": 72,
                  "rating": 4.9,
                  "website": "http://primecaredental.pk/",
                  "distance_km": 0.717
            },
            {
                  "place_id": "ChIJtUSIQyIFGTkR8_qxYfH-XWE",
                  "name": "Shamza Dental Care, Akram Medical Complex",
                  "reviews_count": 44,
                  "rating": 5,
                  "website": "https://shamzadentalcare.com/",
                  "distance_km": 1.332
            }
      ],
      "working_n": 5,
      "flag": "normal",
      "locality_source": "local_group",
      "isolation_bonus": 0,
      "locality_avg_reviews": 77,
      "locality_avg_rating": 4.92,
      "locality_sample_size": 5,
      "computed_at": {
            "$date": "2026-06-03T07:52:47.949Z"
      }
},
  },
  {
    id: "lead-2",
    name: "De Dental Pro",
    location: "Lahore",
    rating: 4.2,
    reviewsCount: 38,
    phone: "924235756200",
    website: "dedentalpro.pk",
    hasWebsite: true,
    filteredByCriteria: true,
    filteredByCriteriaWithWebsite: true,
    seoGrade: "B",
    seoGradeTrend: "up",
    gbpScore: 72,
    gbpStatus: "Warning",
    mobileSpeed: 45,
    mobileSeo: 75,
    revenueImpact: "PKR 150k-250k",
    missingItems: [
      { name: "Q&A section", severity: "warning" },
      { name: "Description", severity: "critical" }
    ],
    competitors: [
      { name: "Advanced Dental Practice", distance: "0.3km away" },
      { name: "Prime Care Dental", distance: "0.5km away" }
    ],
    technicalHealth: [
      {
        title: "Mobile LCP: 4.8s",
        subtext: "Web accessibility has noticeable delay during paint operations on mobile connections.",
        severity: "warning"
      },
      {
        title: "No Analytics Tag Found",
        subtext: "Cannot track patient actions or estimate true conversion funnels on the site.",
        severity: "critical"
      }
    ],
    reviews: [
      {
        author: "Hamza Malik",
        rating: 5.0,
        date: "2 weeks ago",
        text: "Super clean environment, feels like a luxury clinic. Treatment was quick and completely painless!"
      },
      {
        author: "Sana Ahmed",
        rating: 4.0,
        date: "1 month ago",
        text: "Staff is very polite. The treatment went smoothly, but the prices are noticeably higher than standard Lahore clinics."
      },
      {
        author: "Bilal Butt",
        rating: 4.0,
        date: "2 months ago",
        text: "Nice experience overall. Convenient location, but parking space was very limited."
      },
      {
        author: "Ayesha Kamal",
        rating: 5.0,
        date: "2 weeks ago",
        text: "Very high standard of hygiene. The root canal treatment was absolutely painless."
      },
      {
        author: "Mustafa Khan",
        rating: 3.0,
        date: "1 month ago",
        text: "Doctors are brilliant, but pricing is too premium for general consultations."
      }
    ],
    reviewSummary: {
      status: "positive",
      summary: "Highly rated for premium cleanliness, modern styling, and friendly dental staff. Minor feedback regarding higher-than-average treatment pricing and parking constraints.",
      recurringIssues: [
        { issue: "Premium pricing structures", count: 5 },
        { issue: "Limited parking accessibility", count: 3 }
      ]
    }
  },
  {
    id: "lead-3",
    name: "Prime Care Dental",
    location: "Lahore",
    rating: 3.9,
    reviewsCount: 122,
    phone: "924235756312",
    website: "primecaredental.com",
    hasWebsite: true,
    filteredByCriteria: true,
    filteredByCriteriaWithWebsite: true,
    seoGrade: "D",
    seoGradeTrend: "down",
    gbpScore: 45,
    gbpStatus: "Critical",
    mobileSpeed: 82,
    mobileSeo: 48,
    revenueImpact: "PKR 350k-550k",
    missingItems: [
      { name: "Photos", severity: "critical" },
      { name: "Google Posts", severity: "warning" },
      { name: "Service areas", severity: "warning" }
    ],
    competitors: [
      { name: "De Dental Pro", distance: "0.5km away" },
      { name: "Advanced Dental Practice", distance: "0.7km away" }
    ],
    technicalHealth: [
      {
        title: "CRITICAL: No HTTPS detected",
        subtext: "Site data transfers unencrypted, posing severe liability for patient intake info.",
        severity: "critical"
      },
      {
        title: "Meta Description Missing",
        subtext: "Core index HTML lacks header metadata. Search displays look unstructured.",
        severity: "critical"
      }
    ],
    reviews: [
      {
        author: "Usman Raza",
        rating: 2.0,
        date: "5 days ago",
        text: "The wait time was almost 90 minutes even with a pre-booked slot. The receptionist was quite rude when asked."
      },
      {
        author: "Ayesha Noor",
        rating: 4.0,
        date: "2 weeks ago",
        text: "Dr. Farhan is a very knowledgeable dentist and handled my root canal perfectly. The waiting room was crowded though."
      },
      {
        author: "Omer Hashmi",
        rating: 3.0,
        date: "3 weeks ago",
        text: "The medical treatment is fine, but the administrative scheduling is a complete mess. Don't go if you are in a rush."
      },
      {
        author: "Sadia Malik",
        rating: 2.0,
        date: "1 month ago",
        text: "Highly crowded waiting area. I had to wait for 1 hour despite booking an appointment."
      },
      {
        author: "Fahad Farooq",
        rating: 3.0,
        date: "2 months ago",
        text: "Dental work is good, but clinic management needs to upgrade their booking systems."
      }
    ],
    reviewSummary: {
      status: "critical",
      summary: "While the principal dentists are well-regarded, the clinic suffers from severe administrative bottlenecks. Multiple reviews highlight long waiting room delays and poor booking systems.",
      recurringIssues: [
        { issue: "Excessive waiting times", count: 18 },
        { issue: "Scheduling unreliability", count: 11 },
        { issue: "Unresponsive front desk", count: 6 }
      ]
    }
  },
  {
    id: "lead-4",
    name: "Dental Smile Studio",
    location: "Lahore",
    rating: 4.8,
    reviewsCount: 12,
    phone: "924235756405",
    website: "dentalsmile.com.pk",
    hasWebsite: true,
    filteredByCriteria: false,
    filteredByCriteriaWithWebsite: false,
    seoGrade: "A",
    seoGradeTrend: "stable",
    gbpScore: 88,
    gbpStatus: "Good",
    mobileSpeed: 91,
    mobileSeo: 94,
    revenueImpact: "PKR 50k-120k",
    missingItems: [
      { name: "Q&A section", severity: "warning" }
    ],
    competitors: [
      { name: "Advanced Dental Practice", distance: "1.2km away" },
      { name: "Lahore Dental Hub", distance: "0.8km away" }
    ],
    technicalHealth: [
      {
        title: "Minor Performance warning",
        subtext: "A few excess script tags are present. Mobile loading speed is outstanding.",
        severity: "warning"
      }
    ],
    reviews: [
      {
        author: "Bilal Siddiqui",
        rating: 5.0,
        date: "1 week ago",
        text: "Best dental experience in Lahore! Extremely professional setup, clean instruments, and wonderful staff."
      },
      {
        author: "Mariam Jameel",
        rating: 5.0,
        date: "3 weeks ago",
        text: "The dentist took the time to explain the entire procedure and made me feel completely comfortable. 10/10."
      }
    ],
    reviewSummary: {
      status: "positive",
      summary: "Outstanding praise across all visits. Patients appreciate the personalized doctor care, advanced clean instruments, and friendly approach.",
      recurringIssues: [
        { issue: "Limited local parking spots", count: 2 }
      ]
    }
  },
  {
    id: "lead-5",
    name: "Lahore Dental Hub",
    location: "Lahore",
    rating: 4.1,
    reviewsCount: 46,
    phone: "924235756555",
    website: "lahoredentalhub.pk",
    hasWebsite: true,
    filteredByCriteria: true,
    filteredByCriteriaWithWebsite: false,
    seoGrade: "F",
    seoGradeTrend: "down",
    gbpScore: 20,
    gbpStatus: "Critical",
    mobileSpeed: 30,
    mobileSeo: 15,
    revenueImpact: "PKR 500k-750k",
    missingItems: [
      { name: "Business hours", severity: "critical" },
      { name: "Photos", severity: "critical" },
      { name: "Description", severity: "critical" },
      { name: "Q&A section", severity: "warning" }
    ],
    competitors: [
      { name: "Dental Smile Studio", distance: "0.8km away" },
      { name: "Advanced Dental Practice", distance: "1.5km away" }
    ],
    technicalHealth: [
      {
        title: "CRITICAL: No HTTPS detected",
        subtext: "Severe warning screens force clinical seekers in Chrome to back out prior to visit.",
        severity: "critical"
      },
      {
        title: "Mobile LCP: 9.4s",
        subtext: "Painfully slow render blocking files prevent viewing on entry.",
        severity: "critical"
      }
    ],
    reviews: [
      {
        author: "Kamran Shah",
        rating: 4.0,
        date: "1 month ago",
        text: "Doctors are experienced and did a good job on my crown. However, organizing the booking took multiple calls."
      },
      {
        author: "Hassan Baig",
        rating: 3.0,
        date: "2 months ago",
        text: "They have no website and it is hard to find information. Booking is manual via WhatsApp and responses are very slow."
      }
    ],
    reviewSummary: {
      status: "mixed",
      summary: "Good dental work is delivered, but the clinic struggles with administrative access. The lack of a website makes online discovery and booking highly difficult.",
      recurringIssues: [
        { issue: "No online booking portal", count: 9 },
        { issue: "Slow WhatsApp response times", count: 6 }
      ]
    }
  }
];
