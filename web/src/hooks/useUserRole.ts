'use client';

import { useEffect, useMemo, useState } from 'react';
import { collection, doc, onSnapshot, orderBy, query, setDoc, deleteDoc, Timestamp, getDocs, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export type UserRoleType = 'admin' | 'team';

export type UserRoleDoc = {
  email: string;
  role: UserRoleType;
  ekip_id?: string | null;
  created_at: Date;
  updated_at: Date;
};

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function tsToDate(v: any): Date {
  if (v?.toDate) return v.toDate();
  if (v instanceof Date) return v;
  return new Date(v);
}

const MASTER_ADMIN_EMAIL = 'meoncu@gmail.com';

async function resolveTeamRoleFromEmail(normalizedEmail: string): Promise<{ ekipId: string } | null> {
  const memberSnap = await getDocs(query(collection(db, 'team_members'), where('email', '==', normalizedEmail)));
  if (memberSnap.empty) return null;
  const memberId = memberSnap.docs[0].id;

  const teamsSnap = await getDocs(query(collection(db, 'teams'), where('uye_idleri', 'array-contains', memberId)));
  if (teamsSnap.empty) return null;

  const teams = teamsSnap.docs.map((d) => {
    const data = d.data() as any;
    return { id: d.id, updated_at: tsToDate(data.updated_at || data.updatedAt || data.created_at || data.createdAt) };
  });
  teams.sort((a, b) => b.updated_at.getTime() - a.updated_at.getTime());
  return { ekipId: teams[0].id };
}

export function useUserRole(email?: string | null) {
  const normalizedEmail = useMemo(() => (email ? normalizeEmail(email) : null), [email]);
  const [loading, setLoading] = useState(!!normalizedEmail);
  const [role, setRole] = useState<UserRoleType | null>(null);
  const [ekipId, setEkipId] = useState<string | null>(null);

  useEffect(() => {
    if (!normalizedEmail) {
      setLoading(false);
      setRole(null);
      setEkipId(null);
      return;
    }

    if (normalizedEmail === MASTER_ADMIN_EMAIL) {
      setLoading(false);
      setRole('admin');
      setEkipId(null);
      return;
    }

    setLoading(true);
    const ref = doc(db, 'user_roles', normalizedEmail);
    let cancelled = false;
    const unsub = onSnapshot(
      ref,
      (snap) => {
        if (!snap.exists()) {
          setRole(null);
          setEkipId(null);
          resolveTeamRoleFromEmail(normalizedEmail)
            .then((fallback) => {
              if (cancelled) return;
              if (fallback) {
                setRole('team');
                setEkipId(fallback.ekipId);
              }
              setLoading(false);
            })
            .catch(() => {
              if (cancelled) return;
              setLoading(false);
            });
          return;
        }
        const data = snap.data() as any;
        const nextRole = (data.role as UserRoleType) || null;
        setRole(nextRole);
        setEkipId(data.ekip_id || null);
        setLoading(false);
      },
      () => {
        setRole(null);
        setEkipId(null);
        setLoading(false);
      }
    );
    return () => {
      cancelled = true;
      unsub();
    };
  }, [normalizedEmail]);

  return { loading, role, ekipId, normalizedEmail, masterAdminEmail: MASTER_ADMIN_EMAIL };
}

export function useUserRolesList(enabled: boolean) {
  const [loading, setLoading] = useState(enabled);
  const [roles, setRoles] = useState<UserRoleDoc[]>([]);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      setRoles([]);
      return;
    }
    setLoading(true);
    const q = query(collection(db, 'user_roles'), orderBy('email', 'asc'));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const next = snap.docs.map((d) => {
          const data = d.data() as any;
          return {
            email: data.email || d.id,
            role: data.role as UserRoleType,
            ekip_id: data.ekip_id ?? null,
            created_at: tsToDate(data.created_at),
            updated_at: tsToDate(data.updated_at),
          } satisfies UserRoleDoc;
        });
        setRoles(next);
        setLoading(false);
      },
      () => {
        setRoles([]);
        setLoading(false);
      }
    );
    return () => unsub();
  }, [enabled]);

  return { loading, roles };
}

export async function upsertUserRole(input: {
  email: string;
  role: UserRoleType;
  ekip_id?: string | null;
}) {
  const email = normalizeEmail(input.email);
  const now = new Date();
  await setDoc(
    doc(db, 'user_roles', email),
    {
      email,
      role: input.role,
      ekip_id: input.role === 'team' ? input.ekip_id || null : null,
      created_at: Timestamp.fromDate(now),
      updated_at: Timestamp.fromDate(now),
    },
    { merge: true }
  );
}

export async function removeUserRole(email: string) {
  await deleteDoc(doc(db, 'user_roles', normalizeEmail(email)));
}
