export type CaseMedia = {
  type: 'photo' | 'video' | 'gif'
  url: string
  poster?: string
}

export type JevSummary = {
  job: string
  category?: string
  domain: string
  title: string
  isUseCase: number
  built?: number
  isRecap?: number
  usefulness: number
  model: string
}

export type CaseRecord = {
  id: string
  url: string
  text: string
  summary: string
  createdAt: string
  submittedAt: string
  communityLikes: number
  liked?: boolean
  author: {
    name: string
    handle: string
    avatar: string
    verified: boolean
  }
  stats: {
    likes: number
    replies: number
    reposts: number
    views: number | null
  }
  media: CaseMedia[]
  jev?: JevSummary
}

export type ApiKeys = {
  scrape?: string
  typesafe?: string
  supabaseUrl?: string
  supabaseService?: string
}

export type CaseSort = 'latest' | 'popular'
