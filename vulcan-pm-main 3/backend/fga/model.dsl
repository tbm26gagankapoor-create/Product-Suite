model
  schema 1.1

type user

type organization
  relations
    define admin: [user]
    define member: [user] or admin

type project
  relations
    define organization: [organization]
    define admin: [user] or admin from organization
    define member: [user] or admin or member from organization
    define viewer: [user] or member

type team
  relations
    define project: [project]
    define lead: [user]
    define member: [user] or lead

type task
  relations
    define project: [project]
    define assignee: [user]
    define can_edit: assignee or admin from project or member from project
    define can_view: can_edit or viewer from project

type sprint
  relations
    define project: [project]
    define can_manage: admin from project
    define can_view: member from project or viewer from project
