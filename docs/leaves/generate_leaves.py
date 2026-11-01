"""Build leaves-data.json for the leaves page from the roster schedule JSON files."""

import calendar
import datetime as dt
import json
from collections import defaultdict
from pathlib import Path

LEAVE_TYPES = {"Annual Leave": "annual", "Sick Leave": "sick"}
TYPE_ORDER = {"annual": 0, "sick": 1}

DOCS_DIR = Path(__file__).resolve().parent.parent
OUT_FILE = Path(__file__).resolve().parent / "leaves-data.json"
SOURCES = (("export", DOCS_DIR / "schedules"), ("import", DOCS_DIR / "import" / "schedules"))


def load_records():
    records = []
    seen_ids = set()
    for kind, folder in SOURCES:
        for path in sorted(folder.glob("*.json")):
            if path.name == "index.json":
                continue
            data = json.loads(path.read_text(encoding="utf-8"))
            emp_id = str(data.get("id") or path.stem).strip()
            if emp_id in seen_ids:
                continue
            seen_ids.add(emp_id)
            records.append(
                {
                    "id": emp_id,
                    "name": data.get("name") or "",
                    "dept": data.get("department") or "",
                    "kind": kind,
                    "schedules": data.get("schedules") or {},
                }
            )
    return records


def segments(dates):
    count = 1
    for prev, curr in zip(dates, dates[1:]):
        if (dt.date.fromisoformat(curr) - dt.date.fromisoformat(prev)).days > 1:
            count += 1
    return count


def build():
    months = defaultdict(lambda: defaultdict(list))
    all_months = set()
    all_leave_dates = defaultdict(set)
    for record in load_records():
        for month, days in record["schedules"].items():
            all_months.add(month)
            for day in days:
                leave_type = LEAVE_TYPES.get(day.get("shift_group"))
                date = day.get("date")
                if not leave_type or not date:
                    continue
                key = (record["id"], leave_type)
                months[month][key].append((date, record))
                all_leave_dates[key].add(date)

    # Map every leave date to the end of its continuous run, so a leave that
    # continues into the next month is not considered expired mid-way.
    run_end = {}
    for key, dates in all_leave_dates.items():
        run = []
        for current in sorted(dates):
            if run and (dt.date.fromisoformat(current) - dt.date.fromisoformat(run[-1])).days > 1:
                for day in run:
                    run_end[(key, day)] = run[-1]
                run = []
            run.append(current)
        for day in run:
            run_end[(key, day)] = run[-1]

    for month in all_months:
        months.setdefault(month, defaultdict(list))

    output = {}
    for month in sorted(months):
        year, month_no = (int(part) for part in month.split("-"))
        entries = []
        for (emp_id, leave_type), items in months[month].items():
            dates = sorted({date for date, _ in items})
            record = items[0][1]
            actual_to = max(run_end[((emp_id, leave_type), day)] for day in dates)
            entries.append(
                {
                    "id": emp_id,
                    "name": record["name"],
                    "dept": record["dept"],
                    "kind": record["kind"],
                    "type": leave_type,
                    "days": len(dates),
                    "from": dates[0],
                    "to": dates[-1],
                    "actual_to": actual_to,
                    "segments": segments(dates),
                }
            )
        entries.sort(key=lambda e: (TYPE_ORDER[e["type"]], -e["days"], e["name"].lower()))
        output[month] = {"days": calendar.monthrange(year, month_no)[1], "entries": entries}

    payload = {
        "generated_at": dt.datetime.now(dt.timezone.utc).replace(microsecond=0).isoformat(),
        "months": output,
    }
    OUT_FILE.write_text(
        json.dumps(payload, ensure_ascii=False, separators=(",", ":")),
        encoding="utf-8",
    )
    total = sum(len(m["entries"]) for m in output.values())
    print(f"Wrote {OUT_FILE} - {len(output)} months, {total} leave entries")


if __name__ == "__main__":
    build()
