/** Volunteer opportunity listing (minimal; extend as needed). */
export interface Opportunity {
  id: string;
  title: string;
  description: string;
  location: string;
  organizationId: string;
  applyUrl: string;
  startDate: string;
  endDate: string;
  created: string;
  updated: string;
}

export interface OpportunityStore {
  list: () => Promise<Opportunity[]>;
  read: (id: string) => Promise<Opportunity | undefined>;
  create: (input: Omit<Opportunity, "id"> & { id?: string }) => Promise<Opportunity>;
  update: (opportunity: Opportunity) => Promise<Opportunity>;
  delete: (id: string) => Promise<void>;
}
