from odoo import fields, models


class BakkiAuditLog(models.Model):
    _name = 'bakki.audit_log'
    _description = 'Bakki audit log'
    _order = 'occurred_at desc, id desc'

    actor_user_id = fields.Many2one('res.users', string='Actor', ondelete='set null', index=True)
    event_type = fields.Selection(
        selection=[
            ('system', 'System'),
            ('auth_login', 'Auth Login'),
            ('auth_refresh', 'Auth Refresh'),
            ('auth_logout', 'Auth Logout'),
            ('credential_reveal', 'Credential Reveal'),
            ('credential_copy', 'Credential Copy'),
            ('user_deactivate', 'User Deactivate'),
            ('user_reactivate', 'User Reactivate'),
            ('user_create', 'User Create'),
            ('species_create', 'Species Create'),
            ('species_update', 'Species Update'),
            ('species_inventory_adjustment', 'Species Inventory Adjustment'),
            ('phase_create', 'Phase Create'),
            ('task_create', 'Task Create'),
            ('task_workflow_update', 'Task Workflow Update'),
            ('task_monitoring_result', 'Task Monitoring Result'),
            ('area_metrics_update', 'Area Metrics Update'),
            ('config_change', 'Config Change'),
        ],
        string='Event Type',
        required=True,
        index=True,
    )
    target_model = fields.Char(string='Target Model', index=True)
    target_res_id = fields.Integer(string='Target Record ID', index=True)
    message = fields.Text(string='Message')
    payload = fields.Json(string='Payload')
    ip_address = fields.Char(string='IP Address')
    occurred_at = fields.Datetime(string='Occurred At', default=fields.Datetime.now, required=True, index=True)
