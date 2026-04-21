import type { SyncronizingStore, StoreRecord } from "../types.js";

/** Volunteer profile (minimal; extend as needed). */
export interface Volunteer extends StoreRecord {
  name?: string;
  location?: string;
  created: string;
}

export interface CreateVolunteerParams {
  uri: string;
  name?: string;
  location?: string;
}

export interface UpdateVolunteerParams {
  uri: string;
  name?: string;
  location?: string;
}

export interface VolunteerStore extends SyncronizingStore<Volunteer>{
  list: () => Promise<Volunteer[]>;
  create: (input: CreateVolunteerParams) => Promise<Volunteer>;
  read: (uri: string) => Promise<Volunteer | undefined>;
  update: (volunteer: UpdateVolunteerParams) => Promise<Volunteer>;
  delete: (id: string) => Promise<void>;
}
