import { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";

// Returns { loading, session, profile } where profile is the row from
// public.profiles for the signed-in user (contains their staff_role).
// Any component that needs to know "am I admin/manager/worker, and is my
// account active" should use this rather than re-implementing the query.
export function useStaffSession() {
  const [state, setState] = useState({ loading: true, session: null, profile: null });

  useEffect(() => {
    let mounted = true;

    async function loadProfile(session) {
      if (!session) {
        if (mounted) setState({ loading: false, session: null, profile: null });
        return;
      }
      const { data: profile } = await supabase.from("profiles").select("*").eq("id", session.user.id).single();
      if (mounted) setState({ loading: false, session, profile });
    }

    supabase.auth.getSession().then(({ data: { session } }) => loadProfile(session));

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      loadProfile(session);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return state;
}

export async function signOut() {
  await supabase.auth.signOut();
}
