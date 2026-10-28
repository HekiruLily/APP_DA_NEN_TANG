import { PermissionsAndroid, Platform, NativeModules } from 'react-native';

export interface LocationCoords {
  latitude: number;
  longitude: number;
}

export const requestLocationPermission = async (): Promise<boolean> => {
  if (Platform.OS === 'android') {
    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        {
          title: 'Quyền truy cập vị trí',
          message:
            'Ứng dụng cần quyền truy cập vị trí để gửi vị trí hiện tại của bạn.',
          buttonNeutral: 'Hỏi lại sau',
          buttonNegative: 'Từ chối',
          buttonPositive: 'Đồng ý',
        }
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    } catch (err) {
      console.warn('Location permission error:', err);
      return false;
    }
  }
  return true;
};

export const getCurrentLocation = async (): Promise<LocationCoords> => {
  
  if (NativeModules.RNCGeolocation) {
    try {
      
      const Geolocation = require('@react-native-community/geolocation').default;
      return await new Promise<LocationCoords>((resolve, reject) => {
        Geolocation.getCurrentPosition(
          (position: any) => {
            resolve({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
            });
          },
          (error: any) => {
            
            Geolocation.getCurrentPosition(
              (pos: any) => {
                resolve({
                  latitude: pos.coords.latitude,
                  longitude: pos.coords.longitude,
                });
              },
              (err: any) => reject(err),
              { enableHighAccuracy: false, timeout: 20000, maximumAge: 10000 }
            );
          },
          { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
        );
      });
    } catch (nativeErr) {
      console.warn('RNCGeolocation error, using fallback:', nativeErr);
    }
  }

  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);
    const res = await fetch('https://ipwho.is/', { signal: controller.signal });
    clearTimeout(timeoutId);
    const data = await res.json();
    if (data && data.latitude && data.longitude) {
      return {
        latitude: data.latitude,
        longitude: data.longitude,
      };
    }
  } catch (ipErr) {
    console.warn('IP location fetch error, fallback to default coords:', ipErr);
  }

  
  return {
    latitude: 10.776889,
    longitude: 106.700806,
  };
};
