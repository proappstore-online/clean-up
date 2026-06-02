export interface Job {
  id: string
  poster_id: string
  poster_email: string
  poster_name: string
  title: string
  description: string
  location: string
  lat: number | null
  lng: number | null
  status: 'open' | 'closed'
  created_at: string
  photos?: string[] // public URLs
  bid_count?: number
}

export interface Bid {
  id: string
  job_id: string
  bidder_id: string
  bidder_email: string
  bidder_name: string
  amount: number
  message: string | null
  created_at: string
}

export interface JobPhoto {
  id: string
  job_id: string
  path: string
}
