CREATE TABLE IF NOT EXISTS public.project_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL CHECK (char_length(btrim(title)) BETWEEN 1 AND 200),
  description TEXT NOT NULL CHECK (char_length(btrim(description)) BETWEEN 1 AND 5000),
  goal TEXT CHECK (goal IS NULL OR char_length(goal) <= 1000),
  additional_context TEXT CHECK (additional_context IS NULL OR char_length(additional_context) <= 5000),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','completed','failed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS project_requests_created_at_idx ON public.project_requests (created_at DESC);
CREATE INDEX IF NOT EXISTS project_requests_status_idx ON public.project_requests (status);

CREATE TABLE IF NOT EXISTS public.project_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL UNIQUE REFERENCES public.project_requests(id) ON DELETE CASCADE,
  summary TEXT NOT NULL,
  project_goal TEXT,
  phases JSONB NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(phases) = 'array'),
  recommended_actions JSONB NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(recommended_actions) = 'array'),
  risks JSONB NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(risks) = 'array'),
  estimated_duration TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT ALL ON public.project_requests TO service_role;
GRANT ALL ON public.project_plans TO service_role;

ALTER TABLE public.project_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_plans ENABLE ROW LEVEL SECURITY;
-- No anon/authenticated policies: all access goes through validated server-side functions.

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS update_project_requests_updated_at ON public.project_requests;
CREATE TRIGGER update_project_requests_updated_at BEFORE UPDATE ON public.project_requests
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS update_project_plans_updated_at ON public.project_plans;
CREATE TRIGGER update_project_plans_updated_at BEFORE UPDATE ON public.project_plans
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();