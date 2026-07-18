import { Entity, PrimaryColumn, Column, Index } from "typeorm";

@Entity("user_answers")
@Index("idx_user_answers_category_created", ["category", "createdAt"])
export class UserAnswer {
  @PrimaryColumn({ type: "text" })
  id: string;

  @Column({ type: "text", nullable: false, default: "" })
  category: string;

  @Column({ type: "text", nullable: false, default: "" })
  question: string;

  @Column({ type: "text", nullable: false, default: "" })
  answer: string;

  @Column({ name: "tags_json", type: "text", nullable: false, default: "[]" })
  tagsJson: string;

  @Column({ name: "created_at", type: "text", nullable: false })
  createdAt: string;

  @Column({ name: "updated_at", type: "text", nullable: false })
  updatedAt: string;
}
