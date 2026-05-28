"use client";
import React, { createContext, useContext, useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';

export type Branch = {
  id: string;
  name: string;
  location?: string;
  isDefault: boolean;
};

type BranchContextType = {
  branches: Branch[];
  activeBranch: Branch | null;
  setActiveBranchId: (id: string) => void;
  isLoading: boolean;
};

const BranchContext = createContext<BranchContextType>({
  branches: [],
  activeBranch: null,
  setActiveBranchId: () => {},
  isLoading: true,
});

export const useBranch = () => useContext(BranchContext);

export default function BranchProvider({ children }: { children: React.ReactNode }) {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [activeBranch, setActiveBranch] = useState<Branch | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function fetchBranches() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        setIsLoading(false);
        return;
      }

      // Fetch user orgId and assigned branch
      const { data: userData } = await supabase
        .from('User')
        .select('orgId, branchId')
        .eq('id', session.user.id)
        .single();

      if (!userData?.orgId) {
        setIsLoading(false);
        return;
      }

      // Fetch all branches for this org
      const { data: branchData } = await supabase
        .from('Branch')
        .select('*')
        .eq('orgId', userData.orgId);

      if (branchData && branchData.length > 0) {
        setBranches(branchData);
        // Default to assigned branch, or the org's default branch, or the first one
        let defaultBranch = null;
        if (userData.branchId) {
          defaultBranch = branchData.find(b => b.id === userData.branchId);
        }
        if (!defaultBranch) {
           defaultBranch = branchData.find(b => b.isDefault) || branchData[0];
        }
        setActiveBranch(defaultBranch || null);
      } else if (userData?.orgId) {
        // Automatically insert a default "Main Branch" for this org if none exists
        try {
          const { data: newBranch } = await supabase
            .from('Branch')
            .insert([
              { name: 'Main Branch', orgId: userData.orgId, isDefault: true }
            ])
            .select()
            .single();

          if (newBranch) {
            setBranches([newBranch]);
            setActiveBranch(newBranch);
          }
        } catch (e) {
          console.error("Auto branch creation failed:", e);
        }
      }
      setIsLoading(false);
    }

    fetchBranches();
  }, []);

  const setActiveBranchId = (id: string) => {
    const branch = branches.find(b => b.id === id);
    if (branch) {
      setActiveBranch(branch);
    }
  };

  return (
    <BranchContext.Provider value={{ branches, activeBranch, setActiveBranchId, isLoading }}>
      {children}
    </BranchContext.Provider>
  );
}
