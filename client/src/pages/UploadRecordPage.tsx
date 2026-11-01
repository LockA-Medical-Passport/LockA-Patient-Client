import { Link } from 'react-router-dom'
import { UploadRecordForm } from '../components/records/UploadRecordForm'
import { useWallet } from '../lib/wallet'

export function UploadRecordPage() {
  const { address } = useWallet()

  return (
    <div className="max-w-2xl mx-auto px-6 py-16">
      <Link to="/records" className="text-sm text-brand-blue hover:text-blue-300 inline-flex mb-6">
        ← Back to records
      </Link>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white mb-1">Upload a record</h1>
        <p className="text-slate-400 text-sm">
          Add a document you already have. It is encrypted client-side, stored off-chain, and anchored by
          its commitment on Stellar.
        </p>
      </div>
      {address && <UploadRecordForm patient={address} />}
    </div>
  )
}
