import sys, os, re
sys.path.insert(0, os.path.join('services', 'processor'))
import pandas as pd

phone = pd.Series({
    'network': '5G',
    'wlan': 'Wi-Fi 6',
    'bluetooth': '5.3',
    'nfc': 'Yes'
})

score = 0.0

# 5G check
network_str = str(phone.get('network') or phone.get('technology') or '').lower()
print(f'Network string: "{network_str}"')
if '5g' in network_str:
    score += 40
    print('5G: +40')

# Wi-Fi check
wifi = str(phone.get('wlan') or phone.get('wifi') or '').lower()
print(f'WiFi string: "{wifi}"')
if 'wifi 7' in wifi or 'wi-fi 7' in wifi or '802.11be' in wifi:
    score += 30
    print('WiFi 7: +30')
elif 'wifi 6' in wifi or 'wi-fi 6' in wifi or '802.11ax' in wifi:
    score += 24
    print('WiFi 6: +24')
elif 'wifi 5' in wifi or 'wi-fi 5' in wifi or '802.11ac' in wifi:
    score += 18
    print('WiFi 5: +18')
elif '802.11n' in wifi:
    score += 10
    print('WiFi n: +10')

# NFC check
nfc_value = str(phone.get('nfc') or '').lower()
print(f'NFC value: "{nfc_value}"')
if 'nfc' in nfc_value or 'yes' in nfc_value:
    score += 15
    print('NFC: +15')

# Bluetooth check
bt = str(phone.get('bluetooth') or '').lower()
print(f'Bluetooth string: "{bt}"')
m = re.search(r'(\d+\.\d+|\d+)', bt)
if m:
    try:
        ver = float(m.group(1))
        bt_score = min(15, max(5, (ver-4.0)*5))
        score += bt_score
        print(f'Bluetooth {ver}: +{bt_score}')
    except Exception:
        score += 8
        print('Bluetooth (fallback): +8')

print(f'Total score: {score}')