
-- Create function for updated_at timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Profiles table
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Portfolios table
CREATE TABLE public.portfolios (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.portfolios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own portfolios" ON public.portfolios FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own portfolios" ON public.portfolios FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own portfolios" ON public.portfolios FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own portfolios" ON public.portfolios FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_portfolios_updated_at BEFORE UPDATE ON public.portfolios FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Holdings table
CREATE TABLE public.holdings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  portfolio_id UUID NOT NULL REFERENCES public.portfolios(id) ON DELETE CASCADE,
  ticker TEXT NOT NULL,
  isin TEXT,
  name TEXT NOT NULL,
  purchase_date DATE NOT NULL,
  purchase_price NUMERIC(12,4) NOT NULL,
  quantity NUMERIC(12,4) NOT NULL,
  fees NUMERIC(12,4) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.holdings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view holdings of their portfolios" ON public.holdings FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.portfolios WHERE id = portfolio_id AND user_id = auth.uid())
);
CREATE POLICY "Users can insert holdings into their portfolios" ON public.holdings FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.portfolios WHERE id = portfolio_id AND user_id = auth.uid())
);
CREATE POLICY "Users can update holdings in their portfolios" ON public.holdings FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.portfolios WHERE id = portfolio_id AND user_id = auth.uid())
);
CREATE POLICY "Users can delete holdings from their portfolios" ON public.holdings FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.portfolios WHERE id = portfolio_id AND user_id = auth.uid())
);

CREATE TRIGGER update_holdings_updated_at BEFORE UPDATE ON public.holdings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
