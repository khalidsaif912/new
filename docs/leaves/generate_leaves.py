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
    for kind, folder in SOURCES:
        for path in sorted(folder.glob("*.json")):
            if path.name == "index.json":
                continue
            data = json.loads(path.read_text(encoding="utf-8"))
            emp_id = str(data.get("id") or path.stem).strip()
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


def date_ranges(dates):
    ranges = []
    for date in dates:
        if ranges and (dt.date.fromisoformat(date) - dt.date.fromisoformat(ranges[-1]["to"])).days == 1:
            ranges[-1]["to"] = date
            ranges[-1]["days"] += 1
        else:
            ranges.append({"from": date, "to": date, "days": 1})
    return ranges


def build():
    records = load_records()
    months = defaultdict(lambda: defaultdict(list))
    all_months = set()
    all_leave_dates = defaultdict(set)
    day_group = {}
    for record in records:
        for month, days in record["schedules"].items():
            all_months.add(month)
            for day in days:
                date = day.get("date")
                if date:
                    day_group[(record["kind"], record["id"], date)] = day.get("shift_group")
                leave_type = LEAVE_TYPES.get(day.get("shift_group"))
                if not leave_type or not date:
                    continue
                key = (record["kind"], record["id"], leave_type)
                months[month][key].append((date, record))
                all_leave_dates[key].add(date)

    # Map every leave date to the end of its continuous run, so a leave that
    # continues into the next month is not considered expired mid-way.
    run_end = {}
    runs = []
    for key, dates in all_leave_dates.items():
        run = []
        for current in sorted(dates):
            if run and (dt.date.fromisoformat(current) - dt.date.fromisoformat(run[-1])).days > 1:
                runs.append((key, run))
                for day in run:
                    run_end[(key, day)] = run[-1]
                run = []
            run.append(current)
        if run:
            runs.append((key, run))
            for day in run:
                run_end[(key, day)] = run[-1]

    def return_after(key, last_leave):
        """Off days then first working shift after a leave run, if it resumes."""
        day = dt.date.fromisoformat(last_leave) + dt.timedelta(days=1)
        gap = []
        for _ in range(62):
            group = day_group.get((key[0], key[1], day.isoformat()))
            if group is None:
                return None
            if group == "Off Day":
                gap.append(day)
            elif group in LEAVE_TYPES:
                return None
            else:
                return {"gap": gap, "work": day}
            day += dt.timedelta(days=1)
        return None

    return_by_run = {}
    for key, run in runs:
        info = return_after(key, run[-1])
        if info:
            return_by_run[(key, run[-1])] = info

    for month in all_months:
        months.setdefault(month, defaultdict(list))

    output = {}
    for month in sorted(months):
        year, month_no = (int(part) for part in month.split("-"))
        entries = []
        for (kind, emp_id, leave_type), items in months[month].items():
            dates = sorted({date for date, _ in items})
            record = items[0][1]
            key = (kind, emp_id, leave_type)
            actual_to = max(run_end[(key, day)] for day in dates)
            ranges = date_ranges(dates)
            returns = []
            for date_range in ranges:
                info = return_by_run.get((key, date_range["to"]))
                if not info:
                    continue
                gap = [day for day in info["gap"] if day.strftime("%Y-%m") == month]
                work = info["work"] if info["work"].strftime("%Y-%m") == month else None
                if gap or work:
                    returns.append(
                        {
                            "gap_from": gap[0].isoformat() if gap else None,
                            "gap_to": gap[-1].isoformat() if gap else None,
                            "work": work.isoformat() if work else None,
                        }
                    )
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
                    "segments": len(ranges),
                    "ranges": ranges,
                    "returns": returns,
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
