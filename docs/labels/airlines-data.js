// airlines-data.js
// قاعدة بيانات شركات الطيران حسب AWB Prefix (أول 3 أرقام)
// ملاحظة: أغلب السجلات تحتوي (الاسم + IATA). يمكنك إضافة/تعديل التفاصيل الإضافية في EXTRA_DETAILS بالأسفل.

(function(){
  const COUNTRY_CODE = {
    'Algeria': 'DZ',
    'Angola': 'AO',
    'Argentina': 'AR',
    'Australia': 'AU',
    'Austria': 'AT',
    'Azerbaijan': 'AZ',
    'Bahrain': 'BH',
    'Bangladesh': 'BD',
    'Belarus': 'BY',
    'Belgium': 'BE',
    'Bolivia': 'BO',
    'Botswana': 'BW',
    'Brazil': 'BR',
    'Brunei': 'BN',
    'Bulgaria': 'BG',
    'Burkina Faso': 'BF',
    'Cambodia': 'KH',
    'Canada': 'CA',
    'Chile': 'CL',
    'China': 'CN',
    'Colombia': 'CO',
    'Costa Rica': 'CR',
    'Croatia': 'HR',
    'Cyprus': 'CY',
    'Czech Republic': 'CZ',
    'Czechia': 'CZ',
    'Denmark': 'DK',
    'Ecuador': 'EC',
    'Egypt': 'EG',
    'Ethiopia': 'ET',
    'Fiji': 'FJ',
    'Finland': 'FI',
    'France': 'FR',
    'Georgia': 'GE',
    'Germany': 'DE',
    'Great Britain': 'GB',
    'Greece': 'GR',
    'Hong Kong': 'HK',
    'Iceland': 'IS',
    'India': 'IN',
    'Indonesia': 'ID',
    'Iran': 'IR',
    'Ireland': 'IE',
    'Israel': 'IL',
    'Italy': 'IT',
    'Japan': 'JP',
    'Jordan': 'JO',
    'Kazakhstan': 'KZ',
    'Kenya': 'KE',
    'Korea': 'KR',
    'Kuwait': 'KW',
    'Laos': 'LA',
    'Lebanon': 'LB',
    'Luxembourg': 'LU',
    'Macau': 'MO',
    'Malaysia': 'MY',
    'Mauritius': 'MU',
    'Mongolia': 'MN',
    'Morocco': 'MA',
    'Namibia': 'NA',
    'Netherlands': 'NL',
    'New Zealand': 'NZ',
    'North Korea': 'KP',
    'Norway': 'NO',
    'Oman': 'OM',
    'Pakistan': 'PK',
    'Paraguay': 'PY',
    'Peru': 'PE',
    'Philippines': 'PH',
    'Poland': 'PL',
    'Portugal': 'PT',
    'Qatar': 'QA',
    'Russia': 'RU',
    'Rwanda': 'RW',
    'Saudi Arabia': 'SA',
    'Serbia': 'RS',
    'Seychelles': 'SC',
    'Singapore': 'SG',
    'Solomon Islands': 'SB',
    'South Africa': 'ZA',
    'South Korea': 'KR',
    'Spain': 'ES',
    'Sweden': 'SE',
    'Switzerland': 'CH',
    'Tajikistan': 'TJ',
    'Tanzania': 'TZ',
    'Thailand': 'TH',
    'Tunisia': 'TN',
    'Turkey': 'TR',
    'UAE': 'AE',
    'UK': 'GB',
    'USA': 'US',
    'Ukraine': 'UA',
    'United Arab Emirates': 'AE',
    'United Kingdom': 'GB',
    'United States': 'US',
    'United States of America': 'US',
    'Uzbekistan': 'UZ',
    'Vanuatu': 'VU',
    'Venezuela': 'VE',
    'Vietnam': 'VN',
  };

  const BASE_PREFIXES = {
    '001': ['AMERICAN AIRLINES', 'AA'],
    '004': ['BLUE PANORAMA', 'BV'],
    '006': ['DELTA AIR LINES', 'DL'],
    '014': ['AIR CANADA', 'AC'],
    '016': ['UNITED AIRLINES', 'UA'],
    '018': ['JUNEYAO AIRLINES', 'HO'],
    '020': ['LUFTHANSA CARGO', 'LH'],
    '023': ['FEDEX EXPRESS', 'FX'],
    '027': ['ALASKA AIRLINES', 'AS'],
    '030': ['VUELING', 'VY'],
    '032': ['ASKY', 'KP'],
    '035': ['LATAM AIRLINES COLOMBIA', '4C'],
    '036': ['VOLARIS', 'Y4'],
    '040': ['CAMAIR-CO', 'QC'],
    '044': ['AEROLINEAS ARGENTINAS', 'AR'],
    '045': ['LATAM AIRLINES GROUP', 'LA'],
    '047': ['TAP PORTUGAL', 'TP'],
    '050': ['OLYMPIC AIR', 'OA'],
    '053': ['AER LINGUS', 'EI'],
    '055': ['ITA AIRWAYS', 'AZ'],
    '057': ['AIR FRANCE', 'AF'],
    '061': ['AIR SEYCHELLES', 'HM'],
    '063': ['AIRCALIN', 'SB'],
    '064': ['CZECH AIRLINES', 'OK'],
    '065': ['SAUDI ARABIAN AIRLINES', 'SV'],
    '068': ['LAM', 'TM'],
    '071': ['ETHIOPIAN AIRLINES', 'ET'],
    '072': ['GULF AIR', 'GF'],
    '074': ['KLM', 'KL'],
    '075': ['IBERIA', 'IB'],
    '076': ['MEA', 'ME'],
    '077': ['EGYPTAIR', 'MS'],
    '078': ['CYPRUS AIRWAYS', 'CY'],
    '079': ['PHILIPPINE AIRLINES', 'PR'],
    '080': ['LOT POLISH AIRLINES', 'LO'],
    '081': ['QANTAS', 'QF'],
    '082': ['BRUSSELS AIRLINES', 'SN'],
    '083': ['SOUTH AFRICAN AIRWAYS', 'SA'],
    '086': ['AIR NEW ZEALAND', 'NZ'],
    '096': ['IRAN AIR', 'IR'],
    '098': ['AIR INDIA', 'AI'],
    '101': ['AIR DOLOMITI', 'EN'],
    '104': ['EUROWINGS', 'EW'],
    '105': ['FINNAIR', 'AY'],
    '106': ['CARIBBEAN AIRLINES', 'BW'],
    '108': ['ICELANDAIR', 'FI'],
    '110': ['ALMASRIA UNIVERSAL', 'UJ'],
    '111': ['BAHAMASAIR', 'UP'],
    '112': ['CHINA CARGO AIRLINES', 'CK'],
    '114': ['EL AL', 'LY'],
    '115': ['AIR SERBIA', 'JU'],
    '117': ['SAS', 'SK'],
    '118': ['TAAG ANGOLA AIRLINES', 'DT'],
    '120': ['AIR KORYO', 'JS'],
    '124': ['AIR ALGERIE', 'AH'],
    '125': ['BRITISH AIRWAYS', 'BA'],
    '126': ['GARUDA INDONESIA', 'GA'],
    '127': ['GOL LINHAS AEREAS', 'G3'],
    '128': ['HONG KONG EXPRESS', 'UO'],
    '129': ['MARTINAIR CARGO', 'MP'],
    '131': ['JAPAN AIRLINES', 'JL'],
    '133': ['AVIANCA COSTA RICA', 'LR'],
    '134': ['AVIANCA', 'AV'],
    '135': ['AIR TAHITI', 'VT'],
    '136': ['CUBANA', 'CU'],
    '139': ['AEROMEXICO', 'AM'],
    '140': ['LIAT AIRLINES', 'LI'],
    '141': ['FLYDUBAI', 'FZ'],
    '143': ['AUSTRAL', 'AU'],
    '145': ['LATAM CARGO CHILE', 'UC'],
    '146': ['AIR CORSICA', 'XK'],
    '147': ['ROYAL AIR MAROC', 'AT'],
    '149': ['LUXAIR', 'LG'],
    '151': ['JORDAN AVIATION', 'R5'],
    '155': ['DHL AVIATION', 'ES'],
    '157': ['QATAR AIRWAYS', 'QR'],
    '160': ['CATHAY PACIFIC', 'CX'],
    '169': ['HAHN AIR', 'HR'],
    '171': ['FLYEGYPT', 'FT'],
    '172': ['CARGOLUX', 'CV'],
    '173': ['HAWAIIAN AIRLINES', 'HA'],
    '176': ['EMIRATES', 'EK'],
    '180': ['KOREAN AIR', 'KE'],
    '186': ['AIR NAMIBIA', 'SW'],
    '188': ['CAMBODIA ANGKOR AIR', 'K6'],
    '190': ['AIR CALEDONIE', 'TY'],
    '192': ['SURINAM AIRWAYS', 'PY'],
    '193': ['SOLOMON AIRLINES', 'IE'],
    '195': ['ROSSIYA AIRLINES', 'FV'],
    '197': ['AIR TANZANIA', 'TC'],
    '199': ['TUNISAIR', 'TU'],
    '202': ['TACA', 'TA'],
    '203': ['CEBU PACIFIC', '5J'],
    '205': ['ANA', 'NH'],
    '214': ['PIA PAKISTAN', 'PK'],
    '216': ['NORDWIND AIRLINES', 'N4'],
    '217': ['THAI AIRWAYS', 'TG'],
    '218': ['AIR VANUATU', 'NF'],
    '220': ['LUFTHANSA', 'LH'],
    '226': ['AIR BURKINA', '2J'],
    '228': ['VISTARA', 'UK'],
    '229': ['KUWAIT AIRWAYS', 'KU'],
    '230': ['COPA AIRLINES', 'CM'],
    '232': ['MALAYSIA AIRLINES', 'MH'],
    '235': ['TURKISH AIRLINES', 'TK'],
    '238': ['ARKIA ISRAELI', 'IZ'],
    '239': ['AIR MAURITIUS', 'MK'],
    '244': ['AIR TAHITI NUI', 'TN'],
    '250': ['UZBEKISTAN AIRWAYS', 'HY'],
    '257': ['AUSTRIAN', 'OS'],
    '258': ['AIR MADAGASCAR', 'MD'],
    '260': ['FIJI AIRWAYS', 'FJ'],
    '262': ['URAL AIRLINES', 'U6'],
    '275': ['APG AIRLINES', 'GP'],
    '279': ['JETBLUE', 'B6'],
    '281': ['TAROM', 'RO'],
    '289': ['MIAT MONGOLIAN', 'OM'],
    '297': ['CHINA AIRLINES', 'CI'],
    '298': ['UTAIR', 'UT'],
    '299': ['RUILI AIRLINES', 'DR'],
    '310': ['THAI LION AIR', 'SL'],
    '312': ['INDIGO', '6E'],
    '324': ['SHANDONG AIRLINES', 'SC'],
    '331': ['AZORES AIRLINES', 'S4'],
    '353': ['JAPAN TRANSOCEAN', 'NU'],
    '369': ['ATLAS AIR', '5Y'],
    '374': ['ALBASTAR', 'AP'],
    '381': ['AIR CAIRO', 'SM'],
    '384': ['KAM AIR', 'RQ'],
    '390': ['AEGEAN AIRLINES', 'A3'],
    '394': ['AFRICA WORLD AIRLINES', 'AW'],
    '395': ['CORENDON AIRLINES', 'XC'],
    '396': ['FRENCH BEE', 'BF'],
    '403': ['POLAR AIR CARGO', 'PO'],
    '406': ['UPS AIRLINES', '5X'],
    '413': ['SOMON AIR', 'SZ'],
    '421': ['S7 AIRLINES', 'S7'],
    '427': ['AIR CARAIBES', 'TX'],
    '445': ['PARANAIR', 'ZP'],
    '459': ['RWANDAIR', 'WB'],
    '460': ['WAMOS AIR', 'EB'],
    '462': ['LATAM AIRLINES ECUADOR', 'XL'],
    '465': ['AIR ASTANA', 'KC'],
    '474': ['BINTER CANARIAS', 'NT'],
    '475': ['BLUE AIR', '0B'],
    '479': ['SHENZHEN AIRLINES', 'ZH'],
    '486': ['JAZEERA AIRWAYS', 'J9'],
    '512': ['ROYAL JORDANIAN', 'RJ'],
    '514': ['AIR ARABIA', 'G9'],
    '515': ['TASSILI AIRLINES', 'SF'],
    '537': ['MAHAN AIR', 'W5'],
    '544': ['LATAM AIRLINES PERU', 'LP'],
    '547': ['AVIANCA ECUADOR', '2K'],
    '551': ['EUROATLANTIC AIRWAYS', 'YU'],
    '555': ['AEROFLOT', 'SU'],
    '558': ['ASL AIRLINES FRANCE', '5O'],
    '564': ['SUNEXPRESS', 'XQ'],
    '566': ['UKRAINE INTL', 'PS'],
    '571': ['SAUDIGULF AIRLINES', '6S'],
    '572': ['AIR MOLDOVA', '9U'],
    '577': ['AZUL BRAZILIAN', 'AD'],
    '580': ['AIRBRIDGECARGO', 'RU'],
    '593': ['FLYNAS', 'XY'],
    '603': ['SALAM AIR', 'OV'],
    '605': ['SKY AIRLINE', 'H2'],
    '606': ['GEORGIAN AIRWAYS', 'A9'],
    '607': ['ETIHAD AIRWAYS', 'EY'],
    '618': ['SINGAPORE AIRLINES', 'SQ'],
    '623': ['BULGARIA AIR', 'FB'],
    '624': ['PEGASUS AIRLINES', 'PC'],
    '627': ['LAO AIRLINES', 'QV'],
    '628': ['BELAVIA BELARUSIAN', 'B2'],
    '629': ['SILKAIR', 'MI'],
    '636': ['AIR BOTSWANA', 'BP'],
    '643': ['AIR MALTA', 'KM'],
    '649': ['AIR TRANSAT', 'TS'],
    '655': ['SCAT AIRLINES', 'DV'],
    '656': ['AIR NIUGINI', 'PX'],
    '657': ['AIR BALTIC', 'BT'],
    '666': ['FUZHOU AIRLINES', 'FU'],
    '672': ['ROYAL BRUNEI', 'BI'],
    '675': ['AIR MACAU', 'NX'],
    '683': ['LUFTHANSA CITYLINE', 'CL'],
    '689': ['CITYJET', 'WX'],
    '692': ['LATAM AIRLINES PARAGUAY', 'PZ'],
    '694': ['AIR NOSTRUM', 'YW'],
    '695': ['EVA AIR', 'BR'],
    '696': ['TACV CABO VERDE', 'VR'],
    '700': ['CAL CARGO AIRLINES', '5C'],
    '701': ['WIDEROE', 'WF'],
    '703': ['NEOS', 'NO'],
    '706': ['KENYA AIRWAYS', 'KQ'],
    '710': ['AIR PEACE', 'P4'],
    '712': ['VOLOTEA', 'V7'],
    '718': ['JIN AIR', 'LJ'],
    '722': ['TWAY AIR', 'TW'],
    '724': ['SWISS', 'LX'],
    '725': ['ARIK AIR', 'W3'],
    '730': ['AIR GUILIN', 'GT'],
    '731': ['XIAMEN AIRLINES', 'MF'],
    '738': ['VIETNAM AIRLINES', 'VN'],
    '749': ['AIRLINK', '4Z'],
    '760': ['AIR AUSTRAL', 'UU'],
    '771': ['AZERBAIJAN AIRLINES', 'J2'],
    '774': ['SHANGHAI AIRLINES', 'FM'],
    '775': ['SPICEJET', 'SG'],
    '781': ['CHINA EASTERN', 'MU'],
    '783': ['EVELOP AIRLINES', 'E9'],
    '784': ['CHINA SOUTHERN', 'CZ'],
    '795': ['VIRGIN AUSTRALIA', 'VA'],
    '796': ['NOUVELAIR', 'BJ'],
    '803': ['MANDARIN AIRLINES', 'AE'],
    '804': ['CHINA POSTAL', 'CF'],
    '806': ['JEJU AIR', '7C'],
    '815': ['IRAN ASEMAN', 'EP'],
    '816': ['MALINDO AIR', 'OD'],
    '826': ['TIANJIN AIRLINES', 'GS'],
    '828': ['HONG KONG AIR CARGO', 'RH'],
    '829': ['BANGKOK AIRWAYS', 'PG'],
    '831': ['CROATIA AIRLINES', 'OU'],
    '832': ['ABX AIR', 'GB'],
    '833': ['KUNMING AIRLINES', 'KY'],
    '836': ['HEBEI AIRLINES', 'NS'],
    '838': ['WESTJET', 'WS'],
    '845': ['AERO REPUBLICA', 'P5'],
    '847': ['WEST AIR', 'PN'],
    '851': ['HONG KONG AIRLINES', 'HX'],
    '859': ['LUCKY AIR', '8L'],
    '860': ['YTO CARGO AIRLINES', 'YG'],
    '866': ['OKAY AIRWAYS', 'BK'],
    '871': ['SUPARNA AIRLINES', 'Y8'],
    '872': ['GX AIRLINES', 'GX'],
    '876': ['SICHUAN AIRLINES', '3U'],
    '880': ['HAINAN AIRLINES', 'HU'],
    '881': ['CONDOR', 'DE'],
    '886': ['URUMQI AIR', 'UQ'],
    '891': ['LOONG AIR', 'GJ'],
    '898': ['CAPITAL AIRLINES', 'JD'],
    '909': ['THAI SMILE', 'WE'],
    '910': ['OMAN AIR', 'WY'],
    '921': ['SF AIRLINES', 'O3'],
    '923': ['CORSAIR INTL', 'SS'],
    '926': ['BAMBOO AIRWAYS', 'QH'],
    '930': ['BOA BOLIVIANA', 'OB'],
    '932': ['VIRGIN ATLANTIC', 'VS'],
    '933': ['NCA NIPPON CARGO', 'KZ'],
    '938': ['BATIK AIR', 'ID'],
    '957': ['LATAM AIRLINES BRASIL', 'JJ'],
    '978': ['VIETJET', 'VJ'],
    '987': ['CHINA EXPRESS', 'G5'],
    '988': ['ASIANA AIRLINES', 'OZ'],
    '996': ['AIR EUROPA', 'UX'],
    '997': ['BIMAN BANGLADESH', 'BG'],
    '999': ['AIR CHINA', 'CA'],
    // ============ شركات طيران إضافية تعمل في مطارات دول الخليج ============
    // الإمارات العربية المتحدة
    '203': ['AIR ARABIA ABU DHABI', 'MO'],
    '858': ['WIZZ AIR ABU DHABI', '5W'],
    // شركات شحن وبضائع تعمل في الخليج
    '172': ['CARGOLUX', 'CV'],
    '580': ['AIRBRIDGECARGO', 'RU'],
    '369': ['ATLAS AIR', '5Y'],
    '155': ['DHL AVIATION', 'ES'],
    // شركات طيران آسيوية تعمل في مطارات الخليج
    '870': ['AIR INDIA EXPRESS', 'IX'],
    '312': ['INDIGO AIRLINES', '6E'],
    '775': ['SPICEJET', 'SG'],
    '228': ['VISTARA', 'UK'],
    '997': ['BIMAN BANGLADESH', 'BG'],
    '214': ['PIA PAKISTAN', 'PK'],
    '250': ['UZBEKISTAN AIRWAYS', 'HY'],
    '465': ['AIR ASTANA', 'KC'],
    '618': ['SINGAPORE AIRLINES', 'SQ'],
    '232': ['MALAYSIA AIRLINES', 'MH'],
    '126': ['GARUDA INDONESIA', 'GA'],
    '079': ['PHILIPPINE AIRLINES', 'PR'],
    '217': ['THAI AIRWAYS', 'TG'],
    '738': ['VIETNAM AIRLINES', 'VN'],
    '297': ['CHINA AIRLINES', 'CI'],
    '180': ['KOREAN AIR', 'KE'],
    '988': ['ASIANA AIRLINES', 'OZ'],
    '131': ['JAPAN AIRLINES', 'JL'],
    '205': ['ANA ALL NIPPON', 'NH'],
    '160': ['CATHAY PACIFIC', 'CX'],
    '880': ['HAINAN AIRLINES', 'HU'],
    '781': ['CHINA EASTERN', 'MU'],
    '784': ['CHINA SOUTHERN', 'CZ'],
    '999': ['AIR CHINA', 'CA'],
    // شركات طيران أفريقية تعمل في الخليج
    '071': ['ETHIOPIAN AIRLINES', 'ET'],
    '706': ['KENYA AIRWAYS', 'KQ'],
    '083': ['SOUTH AFRICAN AIRWAYS', 'SA'],
    '077': ['EGYPTAIR', 'MS'],
    '147': ['ROYAL AIR MAROC', 'AT'],
    '199': ['TUNISAIR', 'TU'],
    '124': ['AIR ALGERIE', 'AH'],
    // شركات طيران أوروبية تعمل في الخليج
    '125': ['BRITISH AIRWAYS', 'BA'],
    '057': ['AIR FRANCE', 'AF'],
    '220': ['LUFTHANSA', 'LH'],
    '074': ['KLM', 'KL'],
    '724': ['SWISS', 'LX'],
    '257': ['AUSTRIAN', 'OS'],
    '082': ['BRUSSELS AIRLINES', 'SN'],
    '117': ['SAS SCANDINAVIAN', 'SK'],
    '105': ['FINNAIR', 'AY'],
    '055': ['ITA AIRWAYS', 'AZ'],
    '053': ['AER LINGUS', 'EI'],
    '047': ['TAP PORTUGAL', 'TP'],
    '075': ['IBERIA', 'IB'],
    '235': ['TURKISH AIRLINES', 'TK'],
    '624': ['PEGASUS AIRLINES', 'PC'],
    '564': ['SUNEXPRESS', 'XQ'],
    '080': ['LOT POLISH AIRLINES', 'LO'],
    '390': ['AEGEAN AIRLINES', 'A3'],
    '932': ['VIRGIN ATLANTIC', 'VS'],
    '996': ['AIR EUROPA', 'UX'],
    // شركات طيران أمريكية وأسترالية تعمل في الخليج
    '001': ['AMERICAN AIRLINES', 'AA'],
    '016': ['UNITED AIRLINES', 'UA'],
    '006': ['DELTA AIR LINES', 'DL'],
    '081': ['QANTAS', 'QF'],
    '086': ['AIR NEW ZEALAND', 'NZ'],
    '014': ['AIR CANADA', 'AC'],
    // شركات طيران الشرق الأوسط الأخرى
    '512': ['ROYAL JORDANIAN', 'RJ'],
    '076': ['MEA MIDDLE EAST AIRLINES', 'ME'],
    '096': ['IRAN AIR', 'IR'],
    '815': ['IRAN ASEMAN', 'EP'],
    '537': ['MAHAN AIR', 'W5'],
    '078': ['CYPRUS AIRWAYS', 'CY'],
    '114': ['EL AL ISRAEL', 'LY'],
    '151': ['JORDAN AVIATION', 'R5'],
    // شركات طيران روسية ووسط آسيا
    '555': ['AEROFLOT', 'SU'],
    '421': ['S7 AIRLINES', 'S7'],
    '262': ['URAL AIRLINES', 'U6'],
    '771': ['AZERBAIJAN AIRLINES', 'J2'],
    '606': ['GEORGIAN AIRWAYS', 'A9'],
    '413': ['SOMON AIR', 'SZ']
  };

  // ✅ ألوان ثابتة لكل AWB Prefix (مُولَّدة تلقائيًا بنفس خوارزمية autoColor لضمان عدم تغيّر واجهة المستخدم)
  const PREFIX_COLORS = {
  '001': '#20c557',
  '002': '#ceea66',
  '004': '#c5209c',
  '006': '#20c539',
  '014': '#c5ba20',
  '016': '#c52099',
  '018': '#c5a720',
  '020': '#20adc5',
  '023': '#20c55d',
  '027': '#2047c5',
  '030': '#20b2c5',
  '032': '#c52091',
  '035': '#c52099',
  '036': '#20c539',
  '040': '#c59120',
  '044': '#20c599',
  '045': '#20c539',
  '047': '#7e20c5',
  '050': '#3620c5',
  '053': '#adc520',
  '055': '#83c520',
  '057': '#20b5c5',
  '061': '#c5209c',
  '063': '#a220c5',
  '064': '#c5b220',
  '065': '#20adc5',
  '068': '#c52068',
  '071': '#c55720',
  '072': '#adc520',
  '074': '#c5208c',
  '075': '#3c20c5',
  '076': '#20c552',
  '077': '#c57b20',
  '078': '#c52073',
  '079': '#c53320',
  '080': '#20c55d',
  '081': '#20c5a7',
  '082': '#c52020',
  '083': '#2041c5',
  '086': '#c52054',
  '096': '#76c520',
  '098': '#5fc520',
  '101': '#c58920',
  '104': '#c5aa20',
  '105': '#c5a720',
  '106': '#c52091',
  '108': '#c520a7',
  '110': '#208ec5',
  '111': '#207bc5',
  '112': '#20c52e',
  '114': '#c520c5',
  '115': '#202ec5',
  '117': '#c56820',
  '118': '#ad20c5',
  '120': '#c55420',
  '124': '#206ac5',
  '125': '#2026c5',
  '126': '#7e20c5',
  '127': '#c55a20',
  '128': '#20c52b',
  '129': '#26c520',
  '131': '#9920c5',
  '133': '#2031c5',
  '134': '#20c552',
  '135': '#20afc5',
  '136': '#c5208c',
  '139': '#20c547',
  '140': '#4420c5',
  '141': '#c52081',
  '143': '#c5a220',
  '145': '#20c5ad',
  '146': '#20c57b',
  '147': '#aa20c5',
  '149': '#c55720',
  '151': '#2070c5',
  '155': '#89c520',
  '157': '#c52065',
  '160': '#c5ad20',
  '169': '#76c520',
  '171': '#c5af20',
  '172': '#2089c5',
  '173': '#205fc5',
  '176': '#d60000',
  '180': '#52c520',
  '186': '#4720c5',
  '188': '#65c520',
  '190': '#c520a4',
  '192': '#aac520',
  '193': '#209fc5',
  '195': '#c52020',
  '197': '#20c5bd',
  '199': '#2097c5',
  '202': '#4120c5',
  '203': '#20c5aa',
  '205': '#2099c5',
  '214': '#20c5ad',
  '216': '#c52078',
  '217': '#b520c5',
  '218': '#c52041',
  '220': '#c520a7',
  '226': '#2033c5',
  '228': '#2320c5',
  '229': '#c520c0',
  '230': '#c520af',
  '232': '#20c549',
  '235': '#26c520',
  '238': '#8120c5',
  '239': '#20c565',
  '244': '#20c576',
  '250': '#c5bd20',
  '257': '#c58120',
  '258': '#91c520',
  '260': '#20c53e',
  '262': '#c5205d',
  '275': '#c52083',
  '279': '#c56a20',
  '281': '#70c520',
  '289': '#20c52b',
  '297': '#c54f20',
  '298': '#44c520',
  '299': '#20c5c3',
  '310': '#5d20c5',
  '312': '#94c520',
  '324': '#a420c5',
  '331': '#c520c3',
  '353': '#c52820',
  '369': '#c5203e',
  '374': '#c55220',
  '381': '#2320c5',
  '384': '#205fc5',
  '390': '#20c5a2',
  '394': '#207bc5',
  '395': '#20c3c5',
  '396': '#4fc520',
  '403': '#c56520',
  '406': '#8e20c5',
  '413': '#c58e20',
  '421': '#20c57e',
  '427': '#c5204c',
  '445': '#c52052',
  '459': '#c57320',
  '460': '#2068c5',
  '462': '#c52065',
  '465': '#20c59f',
  '474': '#20b5c5',
  '475': '#c52091',
  '479': '#20a7c5',
  '486': '#c520af',
  '512': '#c52033',
  '514': '#2028c5',
  '515': '#c55f20',
  '537': '#9fc520',
  '544': '#6d20c5',
  '547': '#c5c520',
  '551': '#c5204c',
  '555': '#20c594',
  '558': '#c520ad',
  '564': '#4fc520',
  '566': '#205ac5',
  '571': '#8c20c5',
  '572': '#4920c5',
  '577': '#20c53e',
  '580': '#5ac520',
  '593': '#86c520',
  '603': '#20c528',
  '605': '#36c520',
  '606': '#5f20c5',
  '607': '#c5c520',
  '618': '#20c589',
  '623': '#c53120',
  '624': '#2094c5',
  '627': '#20c53e',
  '628': '#c52039',
  '629': '#2bc520',
  '636': '#c5aa20',
  '643': '#c52031',
  '649': '#9c20c5',
  '655': '#c5c320',
  '656': '#c5209f',
  '657': '#2028c5',
  '666': '#7820c5',
  '672': '#c59720',
  '675': '#a2c520',
  '683': '#203ec5',
  '689': '#c56a20',
  '692': '#c52099',
  '694': '#2031c5',
  '695': '#28c520',
  '696': '#5220c5',
  '700': '#4c20c5',
  '701': '#c52031',
  '703': '#7ec520',
  '706': '#2026c5',
  '710': '#c57020',
  '712': '#2057c5',
  '718': '#b820c5',
  '722': '#2054c5',
  '724': '#2062c5',
  '725': '#9120c5',
  '730': '#83c520',
  '731': '#c54f20',
  '738': '#20a7c5',
  '749': '#20c55a',
  '760': '#4120c5',
  '771': '#20c56d',
  '774': '#b520c5',
  '775': '#6dc520',
  '781': '#20b2c5',
  '783': '#7b20c5',
  '784': '#c52e20',
  '795': '#2320c5',
  '796': '#39c520',
  '803': '#c57e20',
  '804': '#5dc520',
  '806': '#81c520',
  '815': '#2089c5',
  '816': '#5a20c5',
  '826': '#20c5c3',
  '828': '#20c576',
  '829': '#76c520',
  '831': '#2065c5',
  '832': '#c520ad',
  '833': '#5fc520',
  '836': '#20b2c5',
  '838': '#41c520',
  '845': '#20c539',
  '847': '#8320c5',
  '851': '#c520bd',
  '858': '#208ec5',
  '859': '#c59720',
  '860': '#20c528',
  '866': '#c55720',
  '871': '#20c557',
  '872': '#2065c5',
  '876': '#99c520',
  '880': '#c57820',
  '881': '#c54420',
  '886': '#97c520',
  '891': '#c55d20',
  '898': '#2bc520',
  '909': '#c52820',
  '910': '#05c9fa',
  '921': '#7620c5',
  '923': '#adc520',
  '926': '#2023c5',
  '930': '#c52099',
  '932': '#20a4c5',
  '933': '#5ac520',
  '938': '#c55720',
  '957': '#2026c5',
  '978': '#c520a2',
  '987': '#205fc5',
  '988': '#20c55f',
  '996': '#2bc520',
  '997': '#2039c5',
  '999': '#c55220',
};


  // تفاصيل إضافية (يمكنك توسعتها بسهولة)
  // الحقول المقترحة:
  //  nameAr, icao, callsign, country, hub, alliance, cargo, website, phone, notes
  // تفاصيل إضافية موسعة لشركات الطيران
  const EXTRA_DETAILS = {
    // ============ شركات طيران دول الخليج العربي ============
    '910': { nameAr: 'الطيران العُماني', icao:'OMA', callsign:'OMAN AIR', country:'Oman', hub:'MCT (Muscat)', alliance:'—', cargo:'Oman Air Cargo', website:'https://www.omanair.com', phone:'+968 2435 6302', notes:'الناقل الوطني لسلطنة عمان. تتبع الشحن: cargo.omanair.com' },
    '176': { nameAr: 'طيران الإمارات', icao:'UAE', callsign:'EMIRATES', country:'UAE', hub:'DXB (Dubai)', alliance:'—', cargo:'Emirates SkyCargo', website:'https://www.skycargo.com', phone:'+971 600 555555', notes:'شحن الإمارات — المقر DXB. الموقع: emirates.com' },
    '157': { nameAr: 'الخطوط القطرية', icao:'QTR', callsign:'QATARI', country:'Qatar', hub:'DOH (Doha / Hamad)', alliance:'oneworld', cargo:'Qatar Airways Cargo', website:'https://www.qrcargo.com', phone:'+974 4023 0000', notes:'عضو oneWorld — الشحن من مطار حمد DOH' },
    '607': { nameAr: 'الاتحاد للطيران', icao:'ETD', callsign:'ETIHAD', country:'UAE', hub:'AUH (Abu Dhabi)', alliance:'—', cargo:'Etihad Cargo', website:'https://www.etihadcargo.com', phone:'+971 600 555 666', notes:'الناقل الوطني لأبوظبي' },
    '065': { nameAr: 'الخطوط السعودية', icao:'SVA', callsign:'SAUDIA', country:'Saudi Arabia', hub:'JED (Jeddah)', alliance:'SkyTeam', cargo:'Saudia Cargo', website:'https://www.saudiacargo.com', phone:'+966 920022222', notes:'الناقل الوطني للمملكة — عضو SkyTeam' },
    '072': { nameAr: 'طيران الخليج', icao:'GFA', callsign:'GULF AIR', country:'Bahrain', hub:'BAH (Bahrain)', alliance:'—', cargo:'Gulf Air Cargo', website:'https://www.gulfair.com', phone:'+973 17 373737', notes:'الناقل الوطني لمملكة البحرين' },
    '229': { nameAr: 'الخطوط الكويتية', icao:'KAC', callsign:'KUWAITI', country:'Kuwait', hub:'KWI (Kuwait)', alliance:'—', cargo:'Kuwait Airways Cargo', website:'https://www.kuwaitairways.com', phone:'+965 171', notes:'الناقل الوطني لدولة الكويت' },
    '593': { nameAr: 'طيران ناس', icao:'KNE', callsign:'NAS EXPRESS', country:'Saudi Arabia', hub:'RUH/JED', alliance:'—', cargo:'—', website:'https://www.flynas.com', phone:'+966 920001234', notes:'أول شركة طيران اقتصادي سعودية' },
    '603': { nameAr: 'طيران سلام', icao:'OMS', callsign:'SALAM AIR', country:'Oman', hub:'MCT (Muscat)', alliance:'—', cargo:'—', website:'https://www.salamair.com', phone:'+968 2464 0333', notes:'شركة طيران اقتصادي عمانية' },
    '514': { nameAr: 'العربية للطيران', icao:'ABY', callsign:'ARABIA', country:'UAE', hub:'SHJ (Sharjah)', alliance:'—', cargo:'—', website:'https://www.airarabia.com', phone:'+971 6 558 0000', notes:'أول شركة طيران اقتصادي في الشرق الأوسط' },
    '141': { nameAr: 'فلاي دبي', icao:'FDB', callsign:'SKYDUBAI', country:'UAE', hub:'DXB (Dubai)', alliance:'—', cargo:'flydubai Cargo', website:'https://www.flydubai.com', phone:'+971 600 544445', notes:'شركة طيران اقتصادي إماراتية' },
    '486': { nameAr: 'طيران الجزيرة', icao:'JZR', callsign:'JAZEERA', country:'Kuwait', hub:'KWI (Kuwait)', alliance:'—', cargo:'—', website:'https://www.jazeeraairways.com', phone:'+965 177', notes:'شركة طيران اقتصادي كويتية' },
    '571': { nameAr: 'طيران السعودية الخليجية', icao:'SGS', callsign:'SAUDIGULF', country:'Saudi Arabia', hub:'DMM (Dammam)', alliance:'—', cargo:'—', website:'https://www.saudigulfairlines.com', phone:'+966 138263355', notes:'شركة طيران سعودية خاصة' },
    '858': { nameAr: 'ويز إير أبوظبي', icao:'WAZ', callsign:'WIZZ ABU DHABI', country:'UAE', hub:'AUH (Abu Dhabi)', alliance:'—', cargo:'—', website:'https://www.wizzair.com', phone:'+971 600 599969', notes:'توقفت عمليات ويز إير أبوظبي عام 2024' },
    
    // ============ شركات طيران الشرق الأوسط ============
    '512': { nameAr: 'الملكية الأردنية', icao:'RJA', callsign:'JORDANIAN', country:'Jordan', hub:'AMM (Amman)', alliance:'oneworld', cargo:'Royal Jordanian Cargo', website:'https://www.rj.com', phone:'+962 6 5100000', notes:'الناقل الوطني للأردن' },
    '076': { nameAr: 'طيران الشرق الأوسط', icao:'MEA', callsign:'CEDAR JET', country:'Lebanon', hub:'BEY (Beirut)', alliance:'SkyTeam', cargo:'—', website:'https://www.mea.com.lb', phone:'+961 1 629999', notes:'الناقل الوطني للبنان' },
    '077': { nameAr: 'مصر للطيران', icao:'MSR', callsign:'EGYPTAIR', country:'Egypt', hub:'CAI (Cairo)', alliance:'Star Alliance', cargo:'EgyptAir Cargo', website:'https://www.egyptair.com', phone:'+20 2 2696 2222', notes:'الناقل الوطني لمصر' },
    '096': { nameAr: 'إيران إير', icao:'IRA', callsign:'IRANAIR', country:'Iran', hub:'IKA/THR (Tehran)', alliance:'—', cargo:'Iran Air Cargo', website:'https://www.iranair.com', phone:'+98 21 4662 0000', notes:'الناقل الوطني لإيران' },
    '537': { nameAr: 'ماهان إير', icao:'IRM', callsign:'MAHAN AIR', country:'Iran', hub:'IKA (Tehran)', alliance:'—', cargo:'Mahan Air Cargo', website:'https://www.mahan.aero', phone:'+98 21 4862 4444', notes:'أكبر شركة طيران خاصة في إيران' },
    '815': { nameAr: 'إيران آسمان', icao:'IRC', callsign:'ASEMAN', country:'Iran', hub:'THR (Tehran)', alliance:'—', cargo:'—', website:'https://www.aseman.ir', phone:'+98 21 4405 0000', notes:'شركة طيران إيرانية' },
    '151': { nameAr: 'جوردن أفييشن', icao:'JAV', callsign:'JORDAN AVIATION', country:'Jordan', hub:'AMM (Amman)', alliance:'—', cargo:'—', website:'https://www.jordanaviation.jo', phone:'+962 6 5156100', notes:'شركة طيران عارض أردنية' },
    '381': { nameAr: 'إير كايرو', icao:'MSC', callsign:'AIR CAIRO', country:'Egypt', hub:'HRG/SSH (Hurghada/Sharm)', alliance:'—', cargo:'—', website:'https://www.aircairo.com', phone:'+20 2 2696 2222', notes:'شركة طيران مصرية' },
    '171': { nameAr: 'فلاي إيجيبت', icao:'FEG', callsign:'FLYEGYPT', country:'Egypt', hub:'CAI (Cairo)', alliance:'—', cargo:'—', website:'https://www.flyegypt.com', phone:'+20 2 2480 8888', notes:'شركة طيران عارض مصرية' },
    '110': { nameAr: 'المصرية العالمية', icao:'LMU', callsign:'ALMASRIA', country:'Egypt', hub:'CAI (Cairo)', alliance:'—', cargo:'—', website:'https://www.almasriaairlines.com', phone:'+20 2 2267 7200', notes:'شركة طيران عارض مصرية' },
    '114': { nameAr: 'العال الإسرائيلية', icao:'ELY', callsign:'ELAL', country:'Israel', hub:'TLV (Tel Aviv)', alliance:'—', cargo:'El Al Cargo', website:'https://www.elal.com', phone:'+972 3 9771111', notes:'الناقل الوطني لإسرائيل' },
    '078': { nameAr: 'الخطوط الجوية القبرصية', icao:'CYP', callsign:'CYPRUS', country:'Cyprus', hub:'LCA (Larnaca)', alliance:'—', cargo:'—', website:'https://www.cyprusairways.com', phone:'+357 22 365 700', notes:'الناقل الوطني لقبرص' },
    
    // ============ شركات طيران تركية ============
    '235': { nameAr: 'الخطوط التركية', icao:'THY', callsign:'TURKISH', country:'Turkey', hub:'IST (Istanbul)', alliance:'Star Alliance', cargo:'Turkish Cargo', website:'https://www.turkishairlines.com', phone:'+90 212 444 0 849', notes:'الناقل الوطني لتركيا - أكبر شبكة وجهات في العالم' },
    '624': { nameAr: 'بيغاسوس', icao:'PGT', callsign:'SUNTURK', country:'Turkey', hub:'SAW (Istanbul Sabiha)', alliance:'—', cargo:'—', website:'https://www.flypgs.com', phone:'+90 850 250 6767', notes:'شركة طيران اقتصادي تركية' },
    '564': { nameAr: 'صن إكسبريس', icao:'SXS', callsign:'SUNEXPRESS', country:'Turkey', hub:'AYT (Antalya)', alliance:'—', cargo:'—', website:'https://www.sunexpress.com', phone:'+90 232 444 0797', notes:'شراكة بين لوفتهانزا والتركية' },
    '395': { nameAr: 'كوريندون', icao:'CAI', callsign:'CORENDON', country:'Turkey', hub:'AYT (Antalya)', alliance:'—', cargo:'—', website:'https://www.corendon.com', phone:'+90 242 330 3030', notes:'شركة طيران عارض تركية' },
    
    // ============ شركات شحن جوي عالمية تعمل في الخليج ============
    '020': { nameAr: 'لوفتهانزا كارغو', icao:'GEC', callsign:'LUFTHANSA CARGO', country:'Germany', hub:'FRA (Frankfurt)', alliance:'—', cargo:'Lufthansa Cargo', website:'https://lufthansa-cargo.com', phone:'+49 69 696 0', notes:'شحن جوي ألماني' },
    '023': { nameAr: 'فيديكس إكسبرس', icao:'FDX', callsign:'FEDEX', country:'USA', hub:'MEM (Memphis)', alliance:'—', cargo:'FedEx Express', website:'https://www.fedex.com', phone:'+1 800 463 3339', notes:'أكبر شركة شحن سريع في العالم' },
    '406': { nameAr: 'يو بي إس للطيران', icao:'UPS', callsign:'UPS', country:'USA', hub:'SDF (Louisville)', alliance:'—', cargo:'UPS Airlines', website:'https://www.ups.com', phone:'+1 800 742 5877', notes:'شحن جوي أمريكي' },
    '172': { nameAr: 'كارغولوكس', icao:'CLX', callsign:'CARGOLUX', country:'Luxembourg', hub:'LUX (Luxembourg)', alliance:'—', cargo:'Cargolux', website:'https://www.cargolux.com', phone:'+352 4211 1', notes:'أكبر شركة شحن جوي أوروبية' },
    '155': { nameAr: 'دي إتش إل للطيران', icao:'DHK', callsign:'WORLD EXPRESS', country:'Germany', hub:'LEJ (Leipzig)', alliance:'—', cargo:'DHL Aviation', website:'https://www.dhl.com', phone:'+49 341 4499 0', notes:'شحن سريع عالمي — محور أوروبا LEJ' },
    '580': { nameAr: 'إير بريدج كارغو', icao:'ABW', callsign:'AIRBRIDGE', country:'Russia', hub:'SVO (Moscow)', alliance:'—', cargo:'AirBridgeCargo', website:'https://www.airbridgecargo.com', phone:'+7 495 786 2555', notes:'شحن جوي روسي' },
    '369': { nameAr: 'أطلس إير', icao:'GTI', callsign:'GIANT', country:'USA', hub:'CVG (Cincinnati)', alliance:'—', cargo:'Atlas Air', website:'https://www.atlasair.com', phone:'+1 914 701 8000', notes:'شحن جوي أمريكي' },
    '403': { nameAr: 'بولار إير كارغو', icao:'PAC', callsign:'POLAR', country:'USA', hub:'CVG (Cincinnati)', alliance:'—', cargo:'Polar Air Cargo', website:'https://www.polaraircargo.com', phone:'+1 516 336 4100', notes:'شحن جوي أمريكي' },
    
    // ============ شركات طيران آسيوية تعمل في الخليج ============
    '098': { nameAr: 'إير إنديا', icao:'AIC', callsign:'AIRINDIA', country:'India', hub:'DEL (Delhi)', alliance:'Star Alliance', cargo:'Air India Cargo', website:'https://www.airindia.com', phone:'+91 124 264 1407', notes:'الناقل الوطني للهند — عضو Star Alliance' },
    '870': { nameAr: 'إير إنديا إكسبريس', icao:'AXB', callsign:'EXPRESS INDIA', country:'India', hub:'COK (Kochi)', alliance:'—', cargo:'—', website:'https://www.airindiaexpress.com', phone:'+91 80 4960 6666', notes:'الذراع الاقتصادي لإير إنديا' },
    '312': { nameAr: 'إنديغو', icao:'IGO', callsign:'IFLY', country:'India', hub:'DEL (Delhi)', alliance:'—', cargo:'—', website:'https://www.goindigo.in', phone:'+91 9910383838', notes:'أكبر شركة طيران في الهند' },
    '775': { nameAr: 'سبايس جيت', icao:'SEJ', callsign:'SPICEJET', country:'India', hub:'DEL (Delhi)', alliance:'—', cargo:'SpiceJet Cargo', website:'https://www.spicejet.com', phone:'+91 124 498 3410', notes:'شركة طيران اقتصادي هندية' },
    '228': { nameAr: 'فيستارا', icao:'VTI', callsign:'VISTARA', country:'India', hub:'DEL (Delhi)', alliance:'—', cargo:'—', website:'https://www.airindia.com', phone:'+91 9289228888', notes:'اندمجت مع إير إنديا عام 2024' },
    '214': { nameAr: 'الخطوط الباكستانية', icao:'PIA', callsign:'PAKISTAN', country:'Pakistan', hub:'KHI/LHE/ISB', alliance:'—', cargo:'PIA Cargo', website:'https://www.piac.com.pk', phone:'+92 21 111 786 786', notes:'الناقل الوطني لباكستان' },
    '997': { nameAr: 'بيمان بنغلادش', icao:'BBC', callsign:'BANGLADESH', country:'Bangladesh', hub:'DAC (Dhaka)', alliance:'—', cargo:'—', website:'https://www.bfrpf.org', phone:'+880 2 8901600', notes:'الناقل الوطني لبنغلادش' },
    '618': { nameAr: 'الخطوط السنغافورية', icao:'SIA', callsign:'SINGAPORE', country:'Singapore', hub:'SIN (Singapore)', alliance:'Star Alliance', cargo:'Singapore Airlines Cargo', website:'https://www.singaporeair.com', phone:'+65 6223 8888', notes:'من أفضل شركات الطيران في العالم' },
    '232': { nameAr: 'الخطوط الماليزية', icao:'MAS', callsign:'MALAYSIAN', country:'Malaysia', hub:'KUL (Kuala Lumpur)', alliance:'oneworld', cargo:'MASkargo', website:'https://www.malaysiaairlines.com', phone:'+60 3 7843 3000', notes:'الناقل الوطني لماليزيا' },
    '217': { nameAr: 'الخطوط التايلاندية', icao:'THA', callsign:'THAI', country:'Thailand', hub:'BKK (Bangkok)', alliance:'Star Alliance', cargo:'Thai Cargo', website:'https://www.thaiairways.com', phone:'+66 2 356 1111', notes:'الناقل الوطني لتايلاند' },
    '126': { nameAr: 'غارودا إندونيسيا', icao:'GIA', callsign:'INDONESIA', country:'Indonesia', hub:'CGK (Jakarta)', alliance:'SkyTeam', cargo:'Garuda Indonesia Cargo', website:'https://www.garuda-indonesia.com', phone:'+62 21 2351 9999', notes:'الناقل الوطني لإندونيسيا' },
    '079': { nameAr: 'الخطوط الفلبينية', icao:'PAL', callsign:'PHILIPPINE', country:'Philippines', hub:'MNL (Manila)', alliance:'—', cargo:'PAL Cargo', website:'https://www.philippineairlines.com', phone:'+63 2 8855 8888', notes:'الناقل الوطني للفلبين' },
    '738': { nameAr: 'فيتنام إيرلاينز', icao:'HVN', callsign:'VIETNAM AIRLINES', country:'Vietnam', hub:'HAN/SGN', alliance:'SkyTeam', cargo:'—', website:'https://www.vietnamairlines.com', phone:'+84 24 3832 0320', notes:'الناقل الوطني لفيتنام' },
    '160': { nameAr: 'كاثي باسيفيك', icao:'CPA', callsign:'CATHAY', country:'Hong Kong', hub:'HKG (Hong Kong)', alliance:'oneworld', cargo:'Cathay Cargo', website:'https://www.cathaypacific.com', phone:'+852 2747 3333', notes:'الناقل الوطني لهونغ كونغ' },
    '180': { nameAr: 'الخطوط الكورية', icao:'KAL', callsign:'KOREANAIR', country:'South Korea', hub:'ICN (Incheon)', alliance:'SkyTeam', cargo:'Korean Air Cargo', website:'https://www.koreanair.com', phone:'+82 2 2656 2001', notes:'الناقل الوطني لكوريا الجنوبية' },
    '988': { nameAr: 'آسيانا', icao:'AAR', callsign:'ASIANA', country:'South Korea', hub:'ICN (Incheon)', alliance:'Star Alliance', cargo:'Asiana Cargo', website:'https://www.flyasiana.com', phone:'+82 2 2669 8000', notes:'ثاني أكبر شركة طيران كورية' },
    '131': { nameAr: 'الخطوط اليابانية', icao:'JAL', callsign:'JAPANAIR', country:'Japan', hub:'HND/NRT (Tokyo)', alliance:'oneworld', cargo:'JAL Cargo', website:'https://www.jal.co.jp', phone:'+81 3 5460 0511', notes:'الناقل الوطني لليابان' },
    '205': { nameAr: 'أول نيبون', icao:'ANA', callsign:'ALL NIPPON', country:'Japan', hub:'HND/NRT (Tokyo)', alliance:'Star Alliance', cargo:'ANA Cargo', website:'https://www.ana.co.jp', phone:'+81 3 6735 1120', notes:'أكبر شركة طيران يابانية' },
    '999': { nameAr: 'إير تشاينا', icao:'CCA', callsign:'AIR CHINA', country:'China', hub:'PEK (Beijing)', alliance:'Star Alliance', cargo:'Air China Cargo', website:'https://www.airchina.com.cn', phone:'+86 10 95583', notes:'الناقل الوطني للصين' },
    '781': { nameAr: 'تشاينا إيسترن', icao:'CES', callsign:'CHINA EASTERN', country:'China', hub:'SHA/PVG (Shanghai)', alliance:'SkyTeam', cargo:'China Eastern Cargo', website:'https://www.ceair.com', phone:'+86 21 95530', notes:'ثاني أكبر شركة طيران صينية' },
    '784': { nameAr: 'تشاينا ساوثرن', icao:'CSN', callsign:'CHINA SOUTHERN', country:'China', hub:'CAN (Guangzhou)', alliance:'—', cargo:'China Southern Cargo', website:'https://www.csair.com', phone:'+86 20 95539', notes:'أكبر شركة طيران في آسيا' },
    '880': { nameAr: 'هاينان إيرلاينز', icao:'CHH', callsign:'HAINAN', country:'China', hub:'PEK/HAK', alliance:'—', cargo:'—', website:'https://www.hainanairlines.com', phone:'+86 898 950718', notes:'خامس نجوم سكاي تراكس' },
    '250': { nameAr: 'أوزبكستان إيرويز', icao:'UZB', callsign:'UZBEK', country:'Uzbekistan', hub:'TAS (Tashkent)', alliance:'—', cargo:'Uzbekistan Airways Cargo', website:'https://www.uzairways.com', phone:'+998 71 140 0100', notes:'الناقل الوطني لأوزبكستان' },
    '465': { nameAr: 'إير أستانا', icao:'KZR', callsign:'ASTANA', country:'Kazakhstan', hub:'ALA/NQZ', alliance:'—', cargo:'—', website:'https://www.airastana.com', phone:'+7 727 244 4477', notes:'الناقل الوطني لكازاخستان' },
    
    // ============ شركات طيران أفريقية تعمل في الخليج ============
    '071': { nameAr: 'الخطوط الإثيوبية', icao:'ETH', callsign:'ETHIOPIAN', country:'Ethiopia', hub:'ADD (Addis Ababa)', alliance:'Star Alliance', cargo:'Ethiopian Cargo', website:'https://www.ethiopianairlines.com', phone:'+251 11 665 9099', notes:'أكبر شركة طيران في أفريقيا' },
    '706': { nameAr: 'كينيا إيرويز', icao:'KQA', callsign:'KENYA', country:'Kenya', hub:'NBO (Nairobi)', alliance:'SkyTeam', cargo:'Kenya Airways Cargo', website:'https://www.kenya-airways.com', phone:'+254 20 327 4747', notes:'الناقل الوطني لكينيا' },
    '083': { nameAr: 'جنوب أفريقيا للطيران', icao:'SAA', callsign:'SPRINGBOK', country:'South Africa', hub:'JNB (Johannesburg)', alliance:'Star Alliance', cargo:'—', website:'https://www.flysaa.com', phone:'+27 11 978 1111', notes:'الناقل الوطني لجنوب أفريقيا' },
    '147': { nameAr: 'الخطوط الملكية المغربية', icao:'RAM', callsign:'ROYALAIR MAROC', country:'Morocco', hub:'CMN (Casablanca)', alliance:'oneworld', cargo:'Royal Air Maroc Cargo', website:'https://www.royalairmaroc.com', phone:'+212 890 000 800', notes:'الناقل الوطني للمغرب' },
    '199': { nameAr: 'تونس إير', icao:'TAR', callsign:'TUNAIR', country:'Tunisia', hub:'TUN (Tunis)', alliance:'—', cargo:'Tunisair Cargo', website:'https://www.tunisair.com', phone:'+216 70 837 000', notes:'الناقل الوطني لتونس' },
    '124': { nameAr: 'الجزائرية', icao:'DAH', callsign:'AIR ALGERIE', country:'Algeria', hub:'ALG (Algiers)', alliance:'—', cargo:'Air Algérie Cargo', website:'https://www.airalgerie.dz', phone:'+213 21 98 63 63', notes:'الناقل الوطني للجزائر' },
    
    // ============ شركات طيران أوروبية تعمل في الخليج ============
    '125': { nameAr: 'الخطوط البريطانية', icao:'BAW', callsign:'SPEEDBIRD', country:'UK', hub:'LHR (London)', alliance:'oneworld', cargo:'IAG Cargo', website:'https://www.britishairways.com', phone:'+44 344 493 0787', notes:'الناقل الوطني للمملكة المتحدة' },
    '057': { nameAr: 'إير فرانس', icao:'AFR', callsign:'AIRFRANS', country:'France', hub:'CDG (Paris)', alliance:'SkyTeam', cargo:'Air France Cargo', website:'https://www.airfrance.com', phone:'+33 1 41 56 78 00', notes:'الناقل الوطني لفرنسا' },
    '220': { nameAr: 'لوفتهانزا', icao:'DLH', callsign:'LUFTHANSA', country:'Germany', hub:'FRA/MUC', alliance:'Star Alliance', cargo:'Lufthansa Cargo', website:'https://www.lufthansa.com', phone:'+49 69 86 799 799', notes:'الناقل الوطني لألمانيا' },
    '074': { nameAr: 'كي إل إم', icao:'KLM', callsign:'KLM', country:'Netherlands', hub:'AMS (Amsterdam)', alliance:'SkyTeam', cargo:'Air France-KLM Cargo', website:'https://www.klm.com', phone:'+31 20 649 9123', notes:'أقدم شركة طيران في العالم' },
    '724': { nameAr: 'سويس إنترناشيونال', icao:'SWR', callsign:'SWISS', country:'Switzerland', hub:'ZRH (Zurich)', alliance:'Star Alliance', cargo:'Swiss WorldCargo', website:'https://www.swiss.com', phone:'+41 848 700 700', notes:'الناقل الوطني لسويسرا' },
    '257': { nameAr: 'النمساوية', icao:'AUA', callsign:'AUSTRIAN', country:'Austria', hub:'VIE (Vienna)', alliance:'Star Alliance', cargo:'—', website:'https://www.austrian.com', phone:'+43 517 89 789', notes:'الناقل الوطني للنمسا' },
    '082': { nameAr: 'بروكسل إيرلاينز', icao:'BEL', callsign:'BEE-LINE', country:'Belgium', hub:'BRU (Brussels)', alliance:'Star Alliance', cargo:'—', website:'https://www.brusselsairlines.com', phone:'+32 2 723 23 23', notes:'الناقل الوطني لبلجيكا' },
    '117': { nameAr: 'ساس الاسكندنافية', icao:'SAS', callsign:'SCANDINAVIAN', country:'Sweden/Norway/Denmark', hub:'CPH/ARN/OSL', alliance:'SkyTeam', cargo:'SAS Cargo', website:'https://www.flysas.com', phone:'+46 8 797 4000', notes:'الناقل الوطني لدول اسكندنافيا' },
    '105': { nameAr: 'فين إير', icao:'FIN', callsign:'FINNAIR', country:'Finland', hub:'HEL (Helsinki)', alliance:'oneworld', cargo:'Finnair Cargo', website:'https://www.finnair.com', phone:'+358 9 818 0800', notes:'الناقل الوطني لفنلندا' },
    '055': { nameAr: 'إيتا إيرويز', icao:'ITY', callsign:'ITARROW', country:'Italy', hub:'FCO (Rome)', alliance:'SkyTeam', cargo:'—', website:'https://www.ita-airways.com', phone:'+39 06 65640', notes:'الناقل الوطني لإيطاليا' },
    '053': { nameAr: 'إير لينغوس', icao:'EIN', callsign:'SHAMROCK', country:'Ireland', hub:'DUB (Dublin)', alliance:'—', cargo:'—', website:'https://www.aerlingus.com', phone:'+353 1 886 8800', notes:'الناقل الوطني لأيرلندا' },
    '047': { nameAr: 'تاب البرتغال', icao:'TAP', callsign:'AIR PORTUGAL', country:'Portugal', hub:'LIS (Lisbon)', alliance:'Star Alliance', cargo:'TAP Cargo', website:'https://www.flytap.com', phone:'+351 211 234 400', notes:'الناقل الوطني للبرتغال' },
    '075': { nameAr: 'إيبيريا', icao:'IBE', callsign:'IBERIA', country:'Spain', hub:'MAD (Madrid)', alliance:'oneworld', cargo:'Iberia Cargo', website:'https://www.iberia.com', phone:'+34 901 111 500', notes:'الناقل الوطني لإسبانيا' },
    '080': { nameAr: 'لوت البولندية', icao:'LOT', callsign:'LOT', country:'Poland', hub:'WAW (Warsaw)', alliance:'Star Alliance', cargo:'LOT Cargo', website:'https://www.lot.com', phone:'+48 22 577 99 52', notes:'الناقل الوطني لبولندا' },
    '390': { nameAr: 'إيجيان', icao:'AEE', callsign:'AEGEAN', country:'Greece', hub:'ATH (Athens)', alliance:'Star Alliance', cargo:'—', website:'https://www.aegeanair.com', phone:'+30 210 626 1000', notes:'أكبر شركة طيران يونانية' },
    '932': { nameAr: 'فيرجن أتلانتيك', icao:'VIR', callsign:'VIRGIN', country:'UK', hub:'LHR (London)', alliance:'SkyTeam', cargo:'Virgin Atlantic Cargo', website:'https://www.virginatlantic.com', phone:'+44 344 811 0000', notes:'شركة طيران بريطانية' },
    '996': { nameAr: 'إير أوروبا', icao:'AEA', callsign:'EUROPA', country:'Spain', hub:'MAD (Madrid)', alliance:'SkyTeam', cargo:'—', website:'https://www.aireuropa.com', phone:'+34 911 401 501', notes:'ثاني أكبر شركة طيران إسبانية' },
    
    // ============ شركات طيران أمريكية وأسترالية تعمل في الخليج ============
    '001': { nameAr: 'أمريكان إيرلاينز', icao:'AAL', callsign:'AMERICAN', country:'USA', hub:'DFW/CLT/MIA', alliance:'oneworld', cargo:'American Airlines Cargo', website:'https://www.aa.com', phone:'+1 800 433 7300', notes:'أكبر شركة طيران في العالم' },
    '016': { nameAr: 'يونايتد إيرلاينز', icao:'UAL', callsign:'UNITED', country:'USA', hub:'EWR/ORD/IAD/SFO', alliance:'Star Alliance', cargo:'United Cargo', website:'https://www.united.com', phone:'+1 800 864 8331', notes:'ثالث أكبر شركة طيران أمريكية' },
    '006': { nameAr: 'دلتا إير لاينز', icao:'DAL', callsign:'DELTA', country:'USA', hub:'ATL/DTW/MSP/SLC', alliance:'SkyTeam', cargo:'Delta Cargo', website:'https://www.delta.com', phone:'+1 800 221 1212', notes:'ثاني أكبر شركة طيران أمريكية' },
    '081': { nameAr: 'كوانتاس', icao:'QFA', callsign:'QANTAS', country:'Australia', hub:'SYD (Sydney)', alliance:'oneworld', cargo:'Qantas Freight', website:'https://www.qantas.com', phone:'+61 2 9691 3636', notes:'الناقل الوطني لأستراليا' },
    '086': { nameAr: 'إير نيوزيلندا', icao:'ANZ', callsign:'NEW ZEALAND', country:'New Zealand', hub:'AKL (Auckland)', alliance:'Star Alliance', cargo:'Air New Zealand Cargo', website:'https://www.airnewzealand.com', phone:'+64 9 357 3000', notes:'الناقل الوطني لنيوزيلندا' },
    '014': { nameAr: 'إير كندا', icao:'ACA', callsign:'AIR CANADA', country:'Canada', hub:'YYZ/YUL/YVR', alliance:'Star Alliance', cargo:'Air Canada Cargo', website:'https://www.aircanada.com', phone:'+1 888 247 2262', notes:'الناقل الوطني لكندا' },
    
    // ============ شركات طيران روسية ووسط آسيا ============
    '555': { nameAr: 'إيروفلوت', icao:'AFL', callsign:'AEROFLOT', country:'Russia', hub:'SVO (Moscow)', alliance:'SkyTeam', cargo:'Aeroflot Cargo', website:'https://www.aeroflot.ru', phone:'+7 495 223 5555', notes:'الناقل الوطني لروسيا' },
    '421': { nameAr: 'إس سفن', icao:'SBI', callsign:'SIBERIAN', country:'Russia', hub:'DME (Moscow)', alliance:'oneworld', cargo:'—', website:'https://www.s7.ru', phone:'+7 800 200 0007', notes:'أكبر شركة طيران خاصة روسية' },
    '262': { nameAr: 'أورال إيرلاينز', icao:'SVR', callsign:'SVERDLOVSK', country:'Russia', hub:'SVX (Yekaterinburg)', alliance:'—', cargo:'—', website:'https://www.uralairlines.ru', phone:'+7 343 345 3456', notes:'شركة طيران روسية' },
    '771': { nameAr: 'أذربيجان إيرلاينز', icao:'AZA', callsign:'AZAL', country:'Azerbaijan', hub:'GYD (Baku)', alliance:'—', cargo:'AZAL Cargo', website:'https://www.azal.az', phone:'+994 12 598 8898', notes:'الناقل الوطني لأذربيجان' },
    '606': { nameAr: 'جورجيان إيرويز', icao:'TGZ', callsign:'TAMAZI', country:'Georgia', hub:'TBS (Tbilisi)', alliance:'—', cargo:'—', website:'https://www.georgian-airways.com', phone:'+995 32 248 5488', notes:'الناقل الوطني لجورجيا' },
    '413': { nameAr: 'سومون إير', icao:'SMR', callsign:'SOMON', country:'Tajikistan', hub:'DYU (Dushanbe)', alliance:'—', cargo:'—', website:'https://www.somonair.com', phone:'+992 44 640 4040', notes:'شركة طيران طاجيكية' },
  };

  function buildDB(){
    const db = {};
    Object.keys(BASE_PREFIXES).forEach(prefix=>{
      const [name, iata] = BASE_PREFIXES[prefix];
      db[prefix] = {
        prefix,
        name,
        nameAr: '',
        iata,
        icao: '',
        callsign: '',
        country: '',
        hub: '',
        alliance: '',
        cargo: '',
        website: '',
        phone: '',
        notes: ''
      };
    });
    Object.keys(EXTRA_DETAILS).forEach(prefix=>{
      if(!db[prefix]){
        const e = EXTRA_DETAILS[prefix];
        db[prefix] = Object.assign({
          prefix,
          name: e.name || '',
          nameAr: '',
          iata: '',
          icao: '',
          callsign: '',
          country: '',
          hub: '',
          alliance: '',
          cargo: '',
          website: '',
          phone: '',
          notes: ''
        }, e);
      } else {
        db[prefix] = Object.assign(db[prefix], EXTRA_DETAILS[prefix]);
      }
    });
    return db;
  }

  window.AIRLINE_DB = buildDB();


  /* ------------------------------------------------------------------
   * Contract Airlines (from office board) — updated: 25 Oct 2025
   * NOTE: هذه القائمة حسب IATA (حرفين/ثلاثة) وليست AWB Prefix.
   * ------------------------------------------------------------------ */
  const CONTRACT_AIRLINES = {
    updatedAt: '2025-10-25',
    with: [
      { iata: 'G9', name: 'Air Arabia' },
      { iata: '3L', name: 'Air Arabia Abu Dhabi' },
      { iata: 'E5', name: 'Air Arabia Egypt' },
      { iata: 'PA', name: 'Airblue' },
      { iata: 'IX', name: 'Air India Express' },
      { iata: 'AI', name: 'Air India' },
      { iata: 'PF', name: 'AirSial' },
      { iata: 'J4', name: 'Badr Airlines' },
      { iata: 'BG', name: 'Biman Bangladesh Airlines' },
      { iata: 'BA', name: 'British Airways' },
      { iata: 'CV', name: 'Cargolux' },
      { iata: '6Q', name: 'Cham Wings Airlines' },
      { iata: 'ES', name: 'DHL Aviation' },
      { iata: 'WK', name: 'Edelweiss Air' },
      { iata: 'MS', name: 'Egyptair' },
      { iata: 'EK', name: 'Emirates' },
      { iata: 'ET', name: 'Ethiopian Airlines' },
      { iata: 'EY', name: 'Etihad Airways' },
      { iata: 'FZ', name: 'flydubai' },
      { iata: '9P', name: 'Fly Jinnah' },
      { iata: 'IS', name: 'Fly Sepehran' },
      { iata: 'G8', name: 'GoAir' },
      { iata: 'GF', name: 'Gulf Air' },
      { iata: '6E', name: 'IndiGo' },
      { iata: 'J9', name: 'Jazeera Airways' },
      { iata: '9W', name: 'Jet Airways' },
      { iata: 'Y9', name: 'Kish Air' },
      { iata: 'KL', name: 'KLM' },
      { iata: 'NO', name: 'Neos' },
      { iata: 'KU', name: 'Kuwait Airways' },
      { iata: 'WY', name: 'Oman Air' },
      { iata: 'PK', name: 'Pakistan International Airlines' },
      { iata: 'PC', name: 'Pegasus Airlines' },
      { iata: 'QR', name: 'Qatar Airways' },
      { iata: 'QB', name: 'Qeshm Air' },
      { iata: 'RX', name: 'Regent Airways' },
      { iata: 'OV', name: 'SalamAir' },
      { iata: 'SV', name: 'Saudia' },
      { iata: 'NL', name: 'Shaheen Air' },
      { iata: 'SG', name: 'SpiceJet' },
      { iata: 'UL', name: 'SriLankan Airlines' },
      { iata: 'LX', name: 'SWISS' },
      { iata: 'HH', name: 'Taban Air' },
      { iata: '3T', name: 'Tarco Aviation / Tarco Air Cargo Services' },
      { iata: 'TG', name: 'Thai Airways' },
      { iata: 'TK', name: 'Turkish Airlines' },
      { iata: 'BS', name: 'US-Bangla Airlines' },
      { iata: 'VR', name: 'Varesh Airlines' },
      { iata: 'UK', name: 'Vistara' }
    ],
    no: [
      { iata: 'EP', name: 'Aseman Airlines' },
      { iata: 'J2', name: 'Azerbaijan Airlines' },
      { iata: 'E4', name: 'Enter Air' },
      { iata: 'XY', name: 'flynas' },
      { iata: 'R5', name: 'Jordan Aviation' },
      { iata: 'NV', name: 'Karun Airlines' },
      { iata: 'PRS', name: 'Pars Air' },
      { iata: 'RJ', name: 'Royal Jordanian' },
      { iata: 'QS', name: 'Smartwings' },
      { iata: '5W', name: 'Wizz Air' }
    ]
  };

  // Expose contract list
  window.CONTRACT_AIRLINES = CONTRACT_AIRLINES;

  /* ------------------------------------------------------------------
   * Color helpers
   * الهدف: كل شركة يكون لها لون ثابت حتى لو ما كان موجود في EXTRA_DETAILS
   * ------------------------------------------------------------------ */
  function hashString(str){
    let h = 0;
    const s = String(str || '');
    for (let i = 0; i < s.length; i++) {
      h = (h * 31 + s.charCodeAt(i)) >>> 0;
    }
    return h;
  }

  function hslToHex(h, s, l){
    // h: 0-360, s/l: 0-100
    s /= 100;
    l /= 100;
    const c = (1 - Math.abs(2 * l - 1)) * s;
    const hh = (h % 360) / 60;
    const x = c * (1 - Math.abs((hh % 2) - 1));
    let r = 0, g = 0, b = 0;
    if (0 <= hh && hh < 1) { r = c; g = x; b = 0; }
    else if (1 <= hh && hh < 2) { r = x; g = c; b = 0; }
    else if (2 <= hh && hh < 3) { r = 0; g = c; b = x; }
    else if (3 <= hh && hh < 4) { r = 0; g = x; b = c; }
    else if (4 <= hh && hh < 5) { r = x; g = 0; b = c; }
    else { r = c; g = 0; b = x; }
    const m = l - c / 2;
    r = Math.round((r + m) * 255);
    g = Math.round((g + m) * 255);
    b = Math.round((b + m) * 255);
    return '#' + [r,g,b].map(v => v.toString(16).padStart(2,'0')).join('');
  }

  function normalizeColor(c){
    const v = String(c || '').trim();
    if (!v) return '';
    if (/^#[0-9a-f]{3}$/i.test(v) || /^#[0-9a-f]{6}$/i.test(v)) return v;
    return '';
  }

  function autoColor(seed){
    const h = hashString(seed) % 360;
    // ألوان واضحة (تجنّب الفاتح جدًا أو الغامق جدًا)
    return hslToHex(h, 72, 45);
  }

  const HUB_COORDS = {
    MCT: [23.5933, 58.2844], DXB: [25.2532, 55.3657], DOH: [25.2731, 51.6080],
    AUH: [24.4330, 54.6511], BAH: [26.2708, 50.6336], KWI: [29.2266, 47.9689],
    JED: [21.6796, 39.1565], RUH: [24.9578, 46.6989], DMM: [26.4712, 49.7979],
    SHJ: [25.3286, 55.5172], FRA: [50.0379, 8.5622], MUC: [48.3538, 11.7861],
    LHR: [51.4700, -0.4543], CDG: [49.0097, 2.5479], AMS: [52.3105, 4.7683],
    IST: [41.2753, 28.7519], SAW: [40.8986, 29.3092], CAI: [30.1219, 31.4056],
    ADD: [8.9779, 38.7993], SIN: [1.3644, 103.9915], HKG: [22.3080, 113.9185],
    DEL: [28.5562, 77.1000], BOM: [19.0896, 72.8656], ICN: [37.4602, 126.4407],
    HND: [35.5494, 139.7798], PEK: [40.0799, 116.6031], CAN: [23.3924, 113.2988],
    JNB: [26.1392, 28.2460], NBO: [1.3192, 36.9278], CMN: [33.3675, -7.5898],
    BEY: [33.8209, 35.4884], AMM: [31.7226, 35.9932], IKA: [35.4161, 51.1522],
    SVO: [55.9726, 37.4146], LUX: [49.6233, 6.2044], MEM: [35.0424, -89.9767],
    ATL: [33.6407, -84.4277], DFW: [32.8998, -97.0403], SYD: [-33.9399, 151.1753],
    AKL: [-37.0082, 174.7850], YYZ: [43.6777, -79.6248], FCO: [41.8003, 12.2389],
    MAD: [40.4983, -3.5676], LIS: [38.7742, -9.1342], WAW: [52.1657, 20.9671],
    ATH: [37.9364, 23.9445], HEL: [60.3172, 24.9633], CPH: [55.6180, 12.6508],
    ZRH: [47.4582, 8.5555], VIE: [48.1103, 16.5697], BRU: [50.9014, 4.4844],
    LEJ: [51.4239, 12.2364], KUL: [2.7456, 101.7099], BKK: [13.6900, 100.7501],
    MNL: [14.5086, 121.0198], CGK: [-6.1256, 106.6558], TAS: [41.2579, 69.2812],
    GYD: [40.4675, 50.0467], TLV: [32.0114, 34.8867], LCA: [34.8751, 33.6249],
    TUN: [36.8510, 10.2272], ALG: [36.6910, 3.2154], AYT: [36.8987, 30.8005],
    COK: [10.1520, 76.4019], SDF: [38.1741, -85.7365], CVG: [39.0488, -84.6678]
  };

  function attachHubGeo(rec){
    const m = String(rec.hub || '').toUpperCase().match(/\b([A-Z]{3})\b/);
    if (!m) return rec;
    const c = HUB_COORDS[m[1]];
    if (!c) return rec;
    rec.hubLat = c[0];
    rec.hubLng = c[1];
    rec.hubMap = 'https://www.google.com/maps?q=' + c[0] + ',' + c[1];
    return rec;
  }

  /* ------------------------------------------------------------------
   * Build AIRLINE_DB (map) expected by index.html
   * ------------------------------------------------------------------ */
  window.AIRLINE_DB = {};
  Object.keys(BASE_PREFIXES).forEach(prefix => {
    const base = BASE_PREFIXES[prefix];
    const extra = EXTRA_DETAILS[prefix] || {};

    let countryCode = extra.countryCode;
    if (!countryCode && extra.country) {
      countryCode = COUNTRY_CODE[extra.country] || '';
    }

    // safe flag: use explicit flag if provided, else derive from countryCode if possible
    let flag = extra.flag;
    if ((!flag || String(flag).trim() === '') && countryCode) {
      const cc = String(countryCode).toUpperCase();
      // Convert country code to regional indicator symbols (emoji)
      try {
        flag = cc.replace(/./g, ch => String.fromCodePoint(0x1F1E6 + ch.charCodeAt(0) - 65));
      } catch (e) {
        flag = extra.flag || '';
      }
    }

    const forcedColor = normalizeColor(extra.color) || normalizeColor(PREFIX_COLORS[prefix]);
    const computedColor = forcedColor || autoColor(`${base[1] || ''}-${prefix}`);

    const rec = {
      prefix,
      name: base[0],
      iata: base[1],
      ...extra,
      countryCode,
      flag,
      color: computedColor
    };
    window.AIRLINE_DB[prefix] = attachHubGeo(rec);
  });

  /* ------------------------------------------------------------------
   * Build AIRLINE_BY_IATA (includes contract-only airlines)
   * ------------------------------------------------------------------ */
  window.AIRLINE_BY_IATA = {};

  // 1) from AIRLINE_DB
  Object.keys(window.AIRLINE_DB).forEach(prefix => {
    const rec = window.AIRLINE_DB[prefix];
    if (rec && rec.iata) {
      window.AIRLINE_BY_IATA[String(rec.iata).toUpperCase()] = rec;
    }
  });

  // 2) contract-only fallbacks (if not found by IATA)
  const IATA_ONLY_DETAILS = {
    // WITH
    'PA': { nameAr: 'إير بلو', country: 'Pakistan' },
    'PF': { nameAr: 'إير سيال', country: 'Pakistan' },
    'J4': { nameAr: 'بدر للطيران', country: 'Sudan' },
    '9P': { nameAr: 'فلاي جناح', country: 'Pakistan' },
    'IS': { nameAr: 'سبهران', country: 'Iran' },
    'G8': { nameAr: 'جو إير', country: 'India' },
    '9W': { nameAr: 'جيت إيرويز', country: 'India' },
    'Y9': { nameAr: 'كيش إير', country: 'Iran' },
    'QB': { nameAr: 'قشم إير', country: 'Iran' },
    'RX': { nameAr: 'ريجنت إيرويز', country: 'Bangladesh' },
    'NL': { nameAr: 'شاهين إير', country: 'Pakistan' },
    'HH': { nameAr: 'طابان إير', country: 'Iran' },
    '3T': { nameAr: 'تاركو للطيران', country: 'Sudan' },
    'BS': { nameAr: 'يو إس–بنغلاديش', country: 'Bangladesh' },
    'VR': { nameAr: 'فاريش للطيران', country: 'Iran' },
    // NO
    'EP': { nameAr: 'إيران آسمان', country: 'Iran' },
    'J2': { nameAr: 'الخطوط الآذربيجانية', country: 'Azerbaijan' },
    'E4': { nameAr: 'إنتر إير', country: 'Poland' },
    'R5': { nameAr: 'الأردنية للطيران', country: 'Jordan' },
    'NV': { nameAr: 'كارون', country: 'Iran' },
    'PRS': { nameAr: 'بارس إير', country: 'Iran' },
    'QS': { nameAr: 'سمارت وينغز', country: 'Czech Republic' },
    '5W': { nameAr: 'ويز إير', country: 'Hungary' }
  };

  const contractAll = [...CONTRACT_AIRLINES.with, ...CONTRACT_AIRLINES.no];
  for (const a of contractAll) {
    const iata = String(a.iata || '').toUpperCase();
    if (!iata) continue;

    // don't overwrite if we already have full record
    if (window.AIRLINE_BY_IATA[iata]) {
      // attach contract status on existing record
      const status = CONTRACT_AIRLINES.with.some(x => x.iata === a.iata) ? 'with' : 'no';
      window.AIRLINE_BY_IATA[iata].contract = status;
      continue;
    }

    const extra = IATA_ONLY_DETAILS[iata] || {};
    let countryCode = extra.countryCode;
    if (!countryCode && extra.country) {
      countryCode = COUNTRY_CODE[extra.country] || '';
    }
    let flag = extra.flag;
    if ((!flag || String(flag).trim() === '') && countryCode) {
      const cc = String(countryCode).toUpperCase();
      try {
        flag = cc.replace(/./g, ch => String.fromCodePoint(0x1F1E6 + ch.charCodeAt(0) - 65));
      } catch (e) {
        flag = '';
      }
    }

    const status = CONTRACT_AIRLINES.with.some(x => x.iata === a.iata) ? 'with' : 'no';

    window.AIRLINE_BY_IATA[iata] = {
      prefix: '',
      awb: '',
      name: a.name || 'UNKNOWN',
      nameAr: extra.nameAr || 'غير متوفر',
      iata,
      icao: extra.icao || '—',
      callsign: extra.callsign || '—',
      country: extra.country || '—',
      hub: extra.hub || '—',
      alliance: extra.alliance || '—',
      cargo: extra.cargo || '—',
      website: extra.website || '—',
      phone: extra.phone || '—',
      notes: 'بيانات من لوحة العقود (IATA فقط) — لا يوجد AWB Prefix مرتبط',
      countryCode,
      flag,
      color: normalizeColor(extra.color) || autoColor(iata),
      contract: status
    };
  }

  // Helper by IATA (for contract list)
  window.getAirlineByIata = function(iata){
    const key = String(iata || '').trim().toUpperCase();
    return window.AIRLINE_BY_IATA[key] || null;
  };

})();
