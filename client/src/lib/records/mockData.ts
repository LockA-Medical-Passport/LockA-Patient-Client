/**
 * Exact UTF-8 strings served by the mock vault. Their SHA-256 digests are the
 * commitments in the mock RecordCommitmentRegistry seed.
 */
export const MOCK_RECORD_CONTENTS: Readonly<Record<string, string>> = {
  'rec-9f21':
    '{"test":"Full blood count","haemoglobin":"13.2 g/dL","whiteBloodCells":"6.4 ×10⁹/L","platelets":"248 ×10⁹/L","interpretation":"Results within reference range."}',
  'rec-8c04':
    '{"study":"Chest X-ray","finding":"Clear lungs with no focal airspace opacity.","impression":"No acute cardiopulmonary abnormality."}',
  'rec-7b55':
    '{"medication":"Amoxicillin","strength":"500 mg","directions":"Take one capsule three times daily for 7 days.","quantity":21}',
  'rec-6a18':
    '{"vaccine":"Tetanus booster","dose":"0.5 mL","route":"Intramuscular","site":"Left deltoid"}',
}

export const MOCK_RECORD_COMMITMENTS: Readonly<Record<string, string>> = {
  'rec-9f21': '67114760bff5fd8b9c3c880c44f8c65ab50ccb05918c36bd052c27050bce92ff',
  'rec-8c04': '4781446a008f188f9550e264073e87f99d6c1dc788e3681ea8b658eedbfbebc8',
  'rec-7b55': '309987b9bff067eeed58b2900f54d9ce6d9f7e10dda18a73c0a84142cc156d68',
  'rec-6a18': '3737cef63912990a3dce58a177c437e59b30c282d0cf39959486f7f568619c94',
}

