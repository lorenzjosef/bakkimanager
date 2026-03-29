from odoo import fields, models


class BakkiTaskEvent(models.Model):
    _name = 'bakki.task_event'
    _description = 'Bakki task event'
    _order = 'occurred_at desc, id desc'

    task_id = fields.Many2one('project.task', string='Task', required=True, ondelete='cascade', index=True)
    event_type = fields.Selection(
        selection=[
            ('assignment', 'Assignment'),
            ('status_change', 'Status Change'),
            ('comment', 'Comment'),
            ('system', 'System'),
        ],
        string='Event Type',
        required=True,
        index=True,
    )
    actor_user_id = fields.Many2one('res.users', string='Actor', ondelete='set null', index=True)
    previous_state = fields.Char(string='Previous State')
    new_state = fields.Char(string='New State')
    message = fields.Text(string='Message')
    payload = fields.Json(string='Payload')
    occurred_at = fields.Datetime(string='Occurred At', default=fields.Datetime.now, required=True, index=True)
