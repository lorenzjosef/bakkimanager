from odoo import fields, models


class BakkiMapAudit(models.Model):
    _name = 'bakki.map_audit'
    _description = 'Bakki map audit'
    _order = 'occurred_at desc, id desc'

    ranch_id = fields.Many2one('bakki.ranch', string='Ranch', ondelete='set null', index=True)
    zone_id = fields.Many2one('bakki.zone', string='Zone', ondelete='set null', index=True)
    area_id = fields.Many2one('bakki.area', string='Area', ondelete='set null', index=True)
    actor_user_id = fields.Many2one('res.users', string='Actor', ondelete='set null', index=True)
    event_type = fields.Selection(
        selection=[
            ('geometry_create', 'Geometry Create'),
            ('geometry_update', 'Geometry Update'),
            ('geometry_delete', 'Geometry Delete'),
            ('selection', 'Selection'),
        ],
        string='Event Type',
        required=True,
        index=True,
    )
    geometry_before = fields.Text(string='Geometry Before')
    geometry_after = fields.Text(string='Geometry After')
    note = fields.Text(string='Note')
    occurred_at = fields.Datetime(string='Occurred At', default=fields.Datetime.now, required=True, index=True)
