import { db } from './supabase.js';
import { loadDropdown } from './utils.js';

// Load dropdowns from DB
loadDropdown('ref_condition', 'condition');
loadDropdown('ref_job_status', 'jobStatus');
