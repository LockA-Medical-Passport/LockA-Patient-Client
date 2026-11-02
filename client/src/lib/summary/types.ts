/** An AI-generated summary returned by locka-api, scoped to consented records. */
export interface PatientSummary {
  /** Passport id the summary was generated for. */
  patientId: string
  /** Plain-text summary. Rendering must never treat this as medical advice. */
  summary: string
  /** When locka-api generated the summary, when supplied. */
  generatedAt: string | null
  /** Number of approved records the summary was built from, when supplied. */
  recordCount: number | null
}

/**
 * Off-chain AI summary half of the patient app. Summaries are sourced from
 * locka-api and are never generated in the browser.
 */
export interface PatientSummaryClient {
  /** Resolves `null` when there are no approved records to summarise yet. */
  getSummary(patientId: string): Promise<PatientSummary | null>
}
