import { useQuery } from '@tanstack/react-query'

export function useReverseGeocode(lat?: number, lng?: number) {
  return useQuery({
    queryKey: ['reverseGeocode', lat, lng],
    queryFn: async () => {
      if (!lat || !lng) return null
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`,
        {
          headers: {
            'Accept-Language': 'en',
          },
        }
      )
      if (!res.ok) throw new Error('Geocoding failed')
      const data = await res.json()
      // Nominatim provides a display_name which is a comma separated string
      return (data.display_name as string) || null
    },
    enabled: !!lat && !!lng,
    staleTime: 1000 * 60 * 60 * 24, // cache for 24 hours
    retry: 1,
  })
}
