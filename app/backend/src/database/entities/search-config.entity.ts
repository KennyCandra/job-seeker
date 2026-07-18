import { Entity, PrimaryColumn, Column } from "typeorm";

@Entity("search_config")
export class SearchConfigEntity {
  @PrimaryColumn({ type: "text" })
  key: string;

  @Column({ type: "text", nullable: false })
  value: string;
}
