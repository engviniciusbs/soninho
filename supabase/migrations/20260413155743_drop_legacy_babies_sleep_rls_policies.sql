-- Remove legacy FOR ALL policies that overlap with family-aware policies
DROP POLICY IF EXISTS "Users can only access their own babies" ON public.babies;
DROP POLICY IF EXISTS "Users can only access sleep sessions of their own babies" ON public.sleep_sessions;;
