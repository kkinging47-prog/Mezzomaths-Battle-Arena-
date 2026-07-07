// Supabase Edge Function scaffold for AI question generation.
// Deploy with: supabase functions deploy generate-questions
// Required secret: AI_API_KEY

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { count, class_level, curriculum, topic, difficulty } = await req.json()
    const apiKey = Deno.env.get('AI_API_KEY')

    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'Missing AI_API_KEY secret.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const prompt = `Generate ${count} multiple-choice maths questions for ${class_level}, curriculum ${curriculum}, topic ${topic}, difficulty ${difficulty}. Return ONLY JSON in this shape: {"questions":[{"question_text":"","option_a":"","option_b":"","option_c":"","option_d":"","correct_answer":"A","explanation":""}]}`

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
      }),
    })

    const result = await response.json()
    const content = result?.choices?.[0]?.message?.content || '{"questions":[]}'
    const parsed = JSON.parse(content)
    const questions = (parsed.questions || []).map((q: Record<string, unknown>) => ({
      class_level,
      curriculum,
      topic,
      difficulty: Number(difficulty || 1),
      ai_generated: true,
      question_text: q.question_text,
      option_a: q.option_a,
      option_b: q.option_b,
      option_c: q.option_c,
      option_d: q.option_d,
      correct_answer: q.correct_answer,
      explanation: q.explanation,
    }))

    return new Response(JSON.stringify({ questions }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
