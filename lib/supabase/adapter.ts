import { createClient } from "@supabase/supabase-js";
import { isDate, type Adapter } from "@auth/core/adapters";

export function format<T>(obj: Record<string, any>): T {
  for (const [key, value] of Object.entries(obj)) {
    if (value === null) {
      delete obj[key];
    }
    if (isDate(value)) {
      obj[key] = new Date(value);
    }
  }
  return obj as T;
}

export function SupabaseAdapter(options: { url: string; secret: string; schema?: string }): Adapter {
  const { url, secret, schema = "public" } = options;
  const supabase = createClient(url, secret, {
    db: { schema },
    auth: { persistSession: false },
  });

  return {
    async createUser(user) {
      const { data, error } = await supabase
        .from("users")
        .insert({
          ...user,
          emailVerified: user.emailVerified?.toISOString(),
        })
        .select()
        .single();
      if (error) throw error;
      return format(data);
    },
    async getUser(id) {
      const { data, error } = await supabase
        .from("users")
        .select()
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      return format(data);
    },
    async getUserByEmail(email) {
      const { data, error } = await supabase
        .from("users")
        .select()
        .eq("email", email)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      return format(data);
    },
    async getUserByAccount({ providerAccountId, provider }) {
      const { data, error } = await supabase
        .from("accounts")
        .select("users (*)")
        .match({ provider, providerAccountId })
        .maybeSingle();
      if (error) throw error;
      if (!data || !(data as any).users) return null;
      return format((data as any).users);
    },
    async updateUser(user) {
      const { data, error } = await supabase
        .from("users")
        .update({
          ...user,
          emailVerified: user.emailVerified?.toISOString(),
        })
        .eq("id", user.id)
        .select()
        .single();
      if (error) throw error;
      return format(data);
    },
    async deleteUser(userId) {
      const { error } = await supabase.from("users").delete().eq("id", userId);
      if (error) throw error;
    },
    async linkAccount(account) {
      const { error } = await supabase.from("accounts").insert(account);
      if (error) throw error;
    },
    async unlinkAccount({ providerAccountId, provider }) {
      const { error } = await supabase
        .from("accounts")
        .delete()
        .match({ provider, providerAccountId });
      if (error) throw error;
    },
    async createSession({ sessionToken, userId, expires }) {
      const { data, error } = await supabase
        .from("sessions")
        .insert({ sessionToken, userId, expires: expires.toISOString() })
        .select()
        .single();
      if (error) throw error;
      return format(data);
    },
    async getSessionAndUser(sessionToken) {
      const { data, error } = await supabase
        .from("sessions")
        .select("*, users(*)")
        .eq("sessionToken", sessionToken)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      const { users: user, ...session } = data as any;
      return {
        user: format(user),
        session: format(session),
      };
    },
    async updateSession(session) {
      const { data, error } = await supabase
        .from("sessions")
        .update({
          ...session,
          expires: session.expires?.toISOString(),
        })
        .eq("sessionToken", session.sessionToken)
        .select()
        .single();
      if (error) throw error;
      return format(data);
    },
    async deleteSession(sessionToken) {
      const { error } = await supabase
        .from("sessions")
        .delete()
        .eq("sessionToken", sessionToken);
      if (error) throw error;
    },
    async createVerificationToken(token) {
      const { data, error } = await supabase
        .from("verification_tokens")
        .insert({
          ...token,
          expires: token.expires.toISOString(),
        })
        .select()
        .single();
      if (error) throw error;
      const { id, ...verificationToken } = data as any;
      return format(verificationToken);
    },
    async useVerificationToken({ identifier, token }) {
      const { data, error } = await supabase
        .from("verification_tokens")
        .delete()
        .match({ identifier, token })
        .select()
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      const { id, ...verificationToken } = data as any;
      return format(verificationToken);
    },
  };
}
