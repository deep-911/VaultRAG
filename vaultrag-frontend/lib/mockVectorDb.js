/**
 * Mock Vector Database for Mnemonic File Oracle
 *
 * Simulates a vector similarity search across a corpus of indexed files.
 * Uses TF-based keyword overlap to score relevance, since we're mocking
 * real embedding distance.
 */

const FILE_CORPUS = [
  {
    id: 1,
    filename: 'Q3_Marketing_Budget_2024.pdf',
    type: 'pdf',
    size: '2.4 MB',
    lastModified: '2024-08-15',
    snippet: 'Detailed breakdown of the Q3 marketing budget including digital ad spend, influencer partnerships, and event sponsorships with projected ROI analysis.',
    content: 'marketing budget q3 quarter three 2024 digital advertising spend allocation influencer partnerships social media campaigns event sponsorship roi return on investment projections forecast revenue expenses cost breakdown paid media organic growth strategy branding awareness customer acquisition',
  },
  {
    id: 2,
    filename: 'Project_Titan_Architecture.md',
    type: 'code',
    size: '156 KB',
    lastModified: '2024-09-02',
    snippet: 'System architecture for Project Titan including microservices topology, API gateway configuration, and database sharding strategy.',
    content: 'project titan architecture system design microservices topology api gateway configuration database sharding strategy kubernetes deployment helm charts docker containers service mesh load balancing horizontal scaling fault tolerance circuit breaker pattern event driven architecture message queue kafka rabbitmq',
  },
  {
    id: 3,
    filename: 'Employee_Onboarding_Handbook.docx',
    type: 'doc',
    size: '890 KB',
    lastModified: '2024-07-20',
    snippet: 'Complete onboarding guide for new employees covering company culture, benefits overview, IT setup, and first-week orientation schedule.',
    content: 'employee onboarding handbook new hire guide company culture values mission benefits health insurance 401k retirement PTO vacation sick leave IT setup laptop email access badge orientation first week schedule team introduction hr human resources policies code of conduct',
  },
  {
    id: 4,
    filename: 'sales_pipeline_q4.xlsx',
    type: 'spreadsheet',
    size: '1.1 MB',
    lastModified: '2024-10-05',
    snippet: 'Q4 sales pipeline with lead tracking, conversion rates, deal stages, and revenue forecasting across all product lines.',
    content: 'sales pipeline q4 quarter four leads prospects opportunities conversion rate deal stages funnel revenue forecast product lines enterprise mid-market SMB SaaS ARR MRR churn retention upsell cross-sell territory management account executive',
  },
  {
    id: 5,
    filename: 'brand_guidelines_v3.pdf',
    type: 'pdf',
    size: '5.7 MB',
    lastModified: '2024-06-10',
    snippet: 'Updated brand guidelines including new logo usage, typography standards, color palette specifications, and social media templates.',
    content: 'brand guidelines logo usage typography fonts color palette hex rgb pantone spacing margins templates social media instagram twitter linkedin facebook banner profile header business card letterhead branding identity visual design creative assets photography style',
  },
  {
    id: 6,
    filename: 'ML_Model_Training_Report.ipynb',
    type: 'code',
    size: '3.2 MB',
    lastModified: '2024-09-18',
    snippet: 'Jupyter notebook documenting the training pipeline for our recommendation engine, including hyperparameter tuning results and accuracy metrics.',
    content: 'machine learning model training report recommendation engine neural network deep learning tensorflow pytorch hyperparameter tuning grid search accuracy precision recall f1 score confusion matrix cross validation training data test data epoch loss gradient descent optimizer adam SGD batch size learning rate',
  },
  {
    id: 7,
    filename: 'client_meeting_notes_sept.docx',
    type: 'doc',
    size: '45 KB',
    lastModified: '2024-09-25',
    snippet: 'Meeting notes from client review sessions in September, capturing feedback on UI redesign, feature prioritization, and go-live timeline.',
    content: 'client meeting notes september feedback review session UI redesign user interface UX user experience feature prioritization roadmap timeline go live launch date sprint planning agile requirements stakeholder presentation demo prototype wireframe mockup',
  },
  {
    id: 8,
    filename: 'infrastructure_costs_breakdown.xlsx',
    type: 'spreadsheet',
    size: '780 KB',
    lastModified: '2024-08-30',
    snippet: 'Monthly AWS infrastructure cost breakdown including EC2, S3, RDS charges, and cost optimization recommendations.',
    content: 'infrastructure costs AWS amazon web services EC2 compute S3 storage RDS database lambda serverless cloudfront CDN bandwidth data transfer monthly billing cost optimization reserved instances spot instances savings plan cloud expenses budget devops',
  },
  {
    id: 9,
    filename: 'product_launch_checklist.pdf',
    type: 'pdf',
    size: '320 KB',
    lastModified: '2024-10-01',
    snippet: 'Pre-launch and post-launch checklist for the new product release including QA signoff, marketing coordination, and support readiness.',
    content: 'product launch checklist release pre-launch post-launch QA quality assurance testing signoff marketing coordination press release blog announcement email campaign support readiness documentation FAQ knowledge base training customer success go to market strategy GTM',
  },
  {
    id: 10,
    filename: 'security_audit_report_2024.pdf',
    type: 'pdf',
    size: '1.8 MB',
    lastModified: '2024-09-12',
    snippet: 'Annual security audit findings including vulnerability assessments, penetration testing results, and compliance status for SOC2 and GDPR.',
    content: 'security audit report vulnerability assessment penetration testing pentest results compliance SOC2 GDPR HIPAA encryption authentication authorization access control firewall intrusion detection incident response data breach risk assessment remediation recommendations cybersecurity',
  },
  {
    id: 11,
    filename: 'vacation_photos_hawaii.zip',
    type: 'image',
    size: '458 MB',
    lastModified: '2024-07-05',
    snippet: 'Collection of vacation photos from the Hawaii trip including beach sunset panoramas, snorkeling adventures, and luau dinner shots.',
    content: 'vacation photos hawaii trip beach sunset panorama ocean waves snorkeling coral reef tropical fish luau dinner hula dance waikiki maui big island hotel resort palm trees surfing adventure travel personal memories family',
  },
  {
    id: 12,
    filename: 'api_documentation_v2.md',
    type: 'code',
    size: '210 KB',
    lastModified: '2024-09-28',
    snippet: 'REST API documentation for v2 endpoints including authentication flows, rate limiting policies, and webhook integration guides.',
    content: 'api documentation REST endpoints authentication OAuth JWT token rate limiting throttling webhooks integration guide swagger openapi specification request response payload json schema error handling pagination versioning CORS headers SDK library',
  },
  {
    id: 13,
    filename: 'quarterly_board_presentation.pptx',
    type: 'doc',
    size: '12.5 MB',
    lastModified: '2024-10-08',
    snippet: 'Board presentation covering company performance metrics, financial results, strategic initiatives, and growth projections for the upcoming quarters.',
    content: 'quarterly board presentation performance metrics financial results revenue profit margin EBITDA growth projections strategic initiatives market expansion hiring plan product roadmap competitive landscape investor relations stakeholder update company direction vision mission OKR',
  },
  {
    id: 14,
    filename: 'database_migration_plan.sql',
    type: 'code',
    size: '89 KB',
    lastModified: '2024-09-08',
    snippet: 'SQL migration scripts for transitioning from PostgreSQL to distributed CockroachDB with data validation and rollback procedures.',
    content: 'database migration plan SQL PostgreSQL CockroachDB distributed database schema migration data validation rollback procedures backup restore replication consistency partitioning indexes queries performance optimization downtime zero deployment blue green canary',
  },
  {
    id: 15,
    filename: 'team_retrospective_notes.docx',
    type: 'doc',
    size: '35 KB',
    lastModified: '2024-09-30',
    snippet: 'Sprint retrospective notes highlighting wins, challenges, and action items for improving team velocity and collaboration.',
    content: 'team retrospective sprint review wins challenges blockers action items velocity improvement collaboration communication standup ceremony agile scrum kanban backlog grooming estimation story points burndown chart continuous improvement feedback team dynamics morale',
  },
];

/**
 * Tokenize a string into lowercase word tokens.
 */
function tokenize(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 1);
}

/**
 * Compute a relevance score (0–1) for a file against a query.
 * Uses weighted TF-overlap + bonus for sequential bigram matches.
 */
function computeRelevance(queryTokens, file) {
  const contentTokens = tokenize(file.content);
  const snippetTokens = tokenize(file.snippet);
  const nameTokens = tokenize(file.filename);

  let totalScore = 0;
  let matchedTokens = 0;

  for (const qt of queryTokens) {
    // Exact content match
    const contentHits = contentTokens.filter((t) => t.includes(qt) || qt.includes(t)).length;
    // Snippet match (weighted higher)
    const snippetHits = snippetTokens.filter((t) => t.includes(qt) || qt.includes(t)).length;
    // Filename match (weighted highest)
    const nameHits = nameTokens.filter((t) => t.includes(qt) || qt.includes(t)).length;

    const tokenScore = contentHits * 1 + snippetHits * 2.5 + nameHits * 4;
    if (tokenScore > 0) {
      matchedTokens++;
      totalScore += tokenScore;
    }
  }

  // Bigram bonus: reward sequential token matches in content
  for (let i = 0; i < queryTokens.length - 1; i++) {
    const bigram = queryTokens[i] + ' ' + queryTokens[i + 1];
    if (file.content.toLowerCase().includes(bigram)) {
      totalScore += 5;
    }
  }

  // Coverage factor: what fraction of query tokens matched
  const coverage = queryTokens.length > 0 ? matchedTokens / queryTokens.length : 0;

  // Normalize: sigmoid-ish scaling to [0, 1]
  const raw = totalScore * coverage;
  const normalized = Math.min(raw / 30, 1);
  return normalized;
}

/**
 * Search the mock file corpus using natural language.
 * Returns the top N results sorted by relevance.
 *
 * @param {string} query - Natural language search query
 * @param {number} topN - Number of results to return (default 3)
 * @returns {Array<{file: Object, score: number}>}
 */
export function searchFiles(query, topN = 3) {
  if (!query || query.trim().length === 0) return [];

  const queryTokens = tokenize(query);
  if (queryTokens.length === 0) return [];

  const results = FILE_CORPUS.map((file) => {
    const score = computeRelevance(queryTokens, file);
    return { file, score };
  })
  .filter((r) => r.score > 0.05)          // Minimum relevance threshold
  .sort((a, b) => b.score - a.score)       // Sort descending
  .slice(0, topN)                           // Top N
  .map((r) => ({
    ...r.file,
    relevanceScore: Math.round(r.score * 100),
  }));

  return results;
}

/**
 * Generate a "system" chat response based on the search results.
 */
export function generateResponse(query, results) {
  if (results.length === 0) {
    const responses = [
      `I couldn't find any files matching "${query}". Try rephrasing your search or using different keywords.`,
      `No matching documents found for that description. I have files about marketing budgets, project architectures, meeting notes, and more — try searching for those topics.`,
      `Hmm, nothing came up for that query. Could you describe the file content differently?`,
    ];
    return responses[Math.floor(Math.random() * responses.length)];
  }

  const count = results.length;
  const topScore = results[0].relevanceScore;

  if (topScore >= 85) {
    return `I found a strong match! Here ${count > 1 ? `are the top ${count} results` : 'is the best result'} for your search:`;
  } else if (topScore >= 60) {
    return `I found ${count} potentially relevant ${count === 1 ? 'file' : 'files'}. Take a look:`;
  } else {
    return `These ${count === 1 ? 'file is' : 'files are'} the closest matches I could find, though relevance is moderate:`;
  }
}

/**
 * Detect conversational intent and return a friendly reply.
 * Returns null if the query should be treated as a file search.
 */
export function getConversationalResponse(query) {
  const text = query.trim().toLowerCase().replace(/[^a-z0-9\s]/g, '');

  // --- Greetings ---
  const greetings = ['hi', 'hello', 'hey', 'hii', 'hiii', 'hola', 'howdy', 'yo', 'sup', 'whats up', 'good morning', 'good afternoon', 'good evening', 'good night'];
  if (greetings.some((g) => text === g || text.startsWith(g + ' '))) {
    const replies = [
      "Hey there! 👋 I'm Oracle, your file search assistant. Tell me what document you're looking for, and I'll find it for you!",
      "Hello! 😊 I'm here to help you find files. Describe what you're looking for — a topic, keyword, or anything you remember about the document.",
      "Hi! 👋 Welcome to Oracle. I can search through your documents to find exactly what you need. What are you looking for?",
      "Hey! 🙌 Great to see you. I'm Oracle — your smart file finder. Just describe the file you need and I'll track it down!",
      "Hello there! ✨ I'm ready to help you find any document. Just tell me what you remember about it!",
    ];
    return replies[Math.floor(Math.random() * replies.length)];
  }

  // --- How are you ---
  const howAreYou = ['how are you', 'how r you', 'how r u', 'how are u', 'hows it going', 'how is it going', 'whats going on', 'how you doing', 'how do you do'];
  if (howAreYou.some((h) => text.includes(h))) {
    const replies = [
      "I'm doing great, thanks for asking! 😄 Ready to help you find some files. What are you looking for?",
      "I'm excellent! Running at full speed and ready to search. 🚀 What document do you need?",
      "All good on my end! 💪 Let me know what file you're trying to find.",
    ];
    return replies[Math.floor(Math.random() * replies.length)];
  }

  // --- Identity / What are you ---
  const identity = ['who are you', 'what are you', 'what can you do', 'what do you do', 'tell me about yourself', 'introduce yourself', 'your name'];
  if (identity.some((i) => text.includes(i))) {
    return "I'm **Oracle** — your intelligent file search assistant! 🔮 I help you find documents by understanding natural language descriptions. Just tell me what you're looking for — a topic, content type, or anything you remember — and I'll search through your files to find the best matches.";
  }

  // --- Thanks / Gratitude ---
  const thanks = ['thank', 'thanks', 'thank you', 'thx', 'ty', 'much appreciated', 'appreciate it', 'grateful'];
  if (thanks.some((t) => text.includes(t))) {
    const replies = [
      "You're welcome! 😊 Let me know if you need to find anything else.",
      "Happy to help! 🙌 Feel free to search for more files anytime.",
      "Anytime! 💫 I'm always here to help you find what you need.",
      "Glad I could help! ✨ Need to find another document? Just ask!",
    ];
    return replies[Math.floor(Math.random() * replies.length)];
  }

  // --- Farewell ---
  const farewells = ['bye', 'goodbye', 'see you', 'see ya', 'later', 'take care', 'good bye', 'cya', 'gotta go', 'im leaving'];
  if (farewells.some((f) => text === f || text.startsWith(f + ' ') || text.endsWith(' ' + f))) {
    const replies = [
      "Goodbye! 👋 Come back anytime you need to find a file. Take care!",
      "See you later! 😊 I'll be here whenever you need me.",
      "Bye! 🌟 Hope I was helpful. Come back anytime!",
    ];
    return replies[Math.floor(Math.random() * replies.length)];
  }

  // --- Help ---
  const helpPhrases = ['help', 'help me', 'how to use', 'how does this work', 'what should i do', 'guide me', 'instructions', 'how to search'];
  if (helpPhrases.some((h) => text === h || text.includes(h))) {
    return "Sure, here's how to use Oracle! 📖\n\n• **Describe a file** — Tell me what you remember about the document (topic, content, keywords).\n• **Use natural language** — e.g. \"Find the Q3 marketing budget\" or \"Where are the meeting notes?\"\n• **Attach files** — Click the 📎 icon to attach files for context.\n• **Voice input** — Click the 🎤 icon to speak your query.\n• **Switch models** — Use the model selector to choose between Oracle Pro, Fast, or Mini.\n\nTry it out! Just type or say what you're looking for. 🚀";
  }

  // Not a conversational message — return null to proceed with file search
  return null;
}

export default FILE_CORPUS;

