export interface MeterInfo {
    meter_tag: string;
    block: string;          // "A", "B", ...
    level: string;          // "L1" etc
    location?: string;
    serial_no?: string;
    meter_size_in?: string;
    remarks?: string;
    place?: string;         // e.g., ADM, AUD
    section?: string;       // e.g., "1", "2"
}

export interface FlatMeterRow {
    block: string;
    level_label: string;    // "Level 1"
    level: string;          // "L1"
    meter_tag: string;
    location: string;
    serial_no: string;
    place: string;
    remarks: string;
    section: string;
}
