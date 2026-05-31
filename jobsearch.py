#!/usr/bin/env python3
"""Fetch jobs via JobSpy and output as CSV. Handles per-site failures gracefully."""

import argparse
import sys
import traceback
import pandas as pd
from jobspy import scrape_jobs

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("search", help="Job search query")
    parser.add_argument("location", help="Location filter")
    parser.add_argument("-n", "--num", type=int, default=25, help="Number of jobs per site")
    parser.add_argument("-o", "--hours", type=int, default=72, help="Hours old")
    parser.add_argument("-f", "--file", help="Output CSV file path")
    parser.add_argument("-s", "--sites", nargs="+", default=["linkedin", "indeed"],
                        help="Job sites to scrape: linkedin, indeed, glassdoor, google")
    args = parser.parse_args()

    all_jobs = None

    for site in args.sites:
        try:
            print(f"Scraping {site}...", file=sys.stderr)
            jobs = scrape_jobs(
                site_name=[site],
                search_term=args.search,
                location=args.location,
                results_wanted=args.num,
                hours_old=args.hours,
                country_indeed="usa",
            )
            if not jobs.empty:
                all_jobs = jobs if all_jobs is None else pd.concat([all_jobs, jobs], ignore_index=True)
                print(f"  Got {len(jobs)} jobs from {site}", file=sys.stderr)
            else:
                print(f"  No jobs from {site}", file=sys.stderr)
        except Exception as e:
            print(f"  {site} failed: {e}", file=sys.stderr)

    if all_jobs is None or all_jobs.empty:
        print("No jobs found from any source.", file=sys.stderr)
        return

    all_jobs = all_jobs.drop_duplicates(subset=["title", "company", "location"])
    csv_file = args.file or sys.stdout

    if csv_file is sys.stdout:
        all_jobs.to_csv(csv_file, index=False)
    else:
        all_jobs.to_csv(csv_file, index=False)
        print(f"Saved {len(all_jobs)} jobs to {csv_file}", file=sys.stderr)


if __name__ == "__main__":
    main()
