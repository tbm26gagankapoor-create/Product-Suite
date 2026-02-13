export const up = (pgm) => {
  pgm.sql(`
-- 18. generate_category_epics
INSERT INTO prompt_templates (name, display_name, category, description, template_body, variables, metadata)
VALUES (
    'generate_category_epics',
    'Generate Category Epics',
    'product_generator',
    'Planning step (batch mode): Generate epics and tasks for a specific category based on PRD context.',
    $$Role: Senior Technical Lead & Project Architect.
Task: Generate epics and atomic tasks ONLY for the "{{categoryName}}" category.

CATEGORY DEFINITION:
{{categoryDescription}}

CATEGORY-SPECIFIC GUIDANCE:
{{categoryGuidance}}

MINIMUM TASKS REQUIRED: {{minimumTasks}}

DOCUMENTATION CONTEXT:
{{prdContext}}
{{#if docSummaries}}

OTHER DOCUMENTS:
{{docSummaries}}
{{/if}}
{{#if researchContext}}

{{researchContext}}
{{/if}}

STRICT REQUIREMENTS:
1. **Focus ONLY on {{categoryName}}** - Do NOT generate tasks for other categories
2. **Minimum Tasks**: Generate AT LEAST {{minimumTasks}} tasks total across all epics in this category
3. **Granularity**: Break down into atomic developer tasks (each 1-3 points)
   - BAD: "Build Authentication System"
   - GOOD: "Create users table schema", "Implement JWT token generation", "Build login API endpoint"
4. **Category Relevance**: Every task must directly relate to {{categoryName}}
5. **Epic Structure**: Group related tasks into 2-5 epics within this category
6. **Task Fields**: Each task needs: title, description (markdown with acceptance criteria), type (task/story/bug), points (1-8), role (Frontend/Backend/DevOps/Design/QA)

CRITICAL OUTPUT INSTRUCTIONS:
- Output ONLY valid JSON, nothing else
- Do NOT include thinking, reasoning, or explanation
- Do NOT wrap in markdown code blocks
- Start response directly with opening brace {

OUTPUT FORMAT (return exactly this structure):
{
  "category": "{{categoryName}}",
  "epics": [
    {
      "title": "Epic Title for {{categoryName}}",
      "description": "Epic description explaining the business value and scope...",
      "tasks": [
        {
          "title": "Atomic task title",
          "description": "**User Story**: As a [role], I want [feature] so that [benefit]\\n\\n**Implementation**: Detailed steps...\\n\\n**Acceptance Criteria**:\\n- Criterion 1\\n- Criterion 2\\n- Criterion 3",
          "type": "task",
          "points": 2,
          "role": "Backend"
        }
      ]
    }
  ]
}$$,
    '[{"name":"categoryName","description":"Category display name","required":true},{"name":"categoryDescription","description":"Category description/scope","required":true},{"name":"categoryGuidance","description":"AI prompt guidance for this category","required":true},{"name":"minimumTasks","description":"Minimum number of tasks required","required":true},{"name":"prdContext","description":"Full PRD content (truncated)","required":true},{"name":"docSummaries","description":"Summaries of other documents","required":false},{"name":"researchContext","description":"Formatted competitive research context block","required":false}]',
    '{"response_format":"json"}'
) ON CONFLICT (name) DO NOTHING;

-- Create v1 version record
INSERT INTO prompt_template_versions (template_id, version, template_body, variables, metadata, change_note, created_by)
SELECT id, 1, template_body, variables, metadata, 'Added category-based epic generation template', 'system'
FROM prompt_templates
WHERE name = 'generate_category_epics'
AND NOT EXISTS (
  SELECT 1 FROM prompt_template_versions
  WHERE template_id = (SELECT id FROM prompt_templates WHERE name = 'generate_category_epics')
);
  `);
};

export const down = (pgm) => {
  pgm.sql(`
DELETE FROM prompt_template_versions
WHERE template_id = (SELECT id FROM prompt_templates WHERE name = 'generate_category_epics');

DELETE FROM prompt_templates WHERE name = 'generate_category_epics';
  `);
};
