import { getBaseUrl } from '@/lib/core/utils/urls'
import { getBrandConfig } from '@/ee/whitelabeling'

export function GET() {
  const baseUrl = getBaseUrl()
  const brand = getBrandConfig()
  const docsUrl = brand.documentationUrl || 'https://docs.sim.ai'

  const content = `# ${brand.name}

> ${brand.name} is the open-source AI workspace where teams build, deploy, and manage AI agents. Connect 1,000+ integrations and every major LLM to create agents that automate real work.

${brand.name} lets teams create agents visually with the workflow builder, conversationally through Chat, or programmatically with the API. The workspace includes knowledge bases, tables, files, and full observability.

## Preferred URLs

- [Homepage](${baseUrl}): Product overview and primary entry point
- [Integrations directory](${baseUrl}/integrations): Public catalog of integrations and automation capabilities
- [Models directory](${baseUrl}/models): Public catalog of AI models, pricing, context windows, and capabilities
- [Blog](${baseUrl}/blog): Announcements, guides, and product context
- [Changelog](${baseUrl}/changelog): Product updates and release notes

## Documentation

- [Documentation](${docsUrl}): Product guides and technical reference
- [Quickstart](${docsUrl}/getting-started): Fastest path to getting started
- [API Reference](${docsUrl}/api-reference): API documentation

## Key Concepts

- **Workspace**: The AI workspace — container for agents, workflows, data sources, and runs
- **Workflow**: Visual builder — directed graph of blocks defining agent logic
- **Block**: Individual step such as an LLM call, tool call, HTTP request, or code execution
- **Trigger**: Event or schedule that initiates a workflow run
- **Execution**: A single run of a workflow with logs and outputs
- **Knowledge Base**: Document store used for retrieval-augmented generation

## Capabilities

- AI workspace for teams
- AI agent creation and deployment
- Integrations across business tools, databases, and communication platforms
- Multi-model LLM orchestration
- Knowledge bases and retrieval-augmented generation
- Table creation and management
- Document creation and processing
- Scheduled and webhook-triggered runs

## Use Cases

- AI agent deployment and orchestration
- Knowledge bases and RAG pipelines
- Customer support automation
- Internal operations workflows across sales, marketing, legal, and finance

## Additional Links

${brand.isWhitelabeled ? '' : '- [GitHub Repository](https://github.com/simstudioai/sim): Open-source codebase\n'}- [Docs](${docsUrl}): Canonical documentation source
- [Terms of Service](${baseUrl}/terms): Legal terms
- [Privacy Policy](${baseUrl}/privacy): Data handling practices
- [Sitemap](${baseUrl}/sitemap.xml): Public URL inventory
`

  return new Response(content, {
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      'Cache-Control': 'public, max-age=86400, s-maxage=86400',
    },
  })
}
