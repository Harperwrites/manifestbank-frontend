'use client'
import Navbar from '../components/Navbar'
import NovemberOffer from '../components/NovemberOffer'
import { useAuth } from '../providers'
export default function NovemberOfferPage() {
  const { me, isLoading } = useAuth()
  return <><Navbar/><main>{isLoading ? <p role="status" style={{padding:40}}>Loading your offer…</p> : <NovemberOffer user={me} standalone/>}</main></>
}
